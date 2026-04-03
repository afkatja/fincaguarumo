import { NextResponse } from "next/server"
import { getEmailsReadyForRetry, updateEmailAfterRetry } from "@/lib/monitoring/emailQueue"
import { sendConfirmationEmail } from "@/lib/sendConfirmationEmail"
import { sendErrorEmail } from "@/lib/sendErrorEmail"
import { getEmailQueueStats } from "@/lib/monitoring/emailQueue"
import { getDatabaseStats } from "@/lib/monitoring/dbMonitor"

export async function POST(request: Request) {
  try {
    console.log("🔄 Processing email queue retries...")
    
    const emailsToRetry = await getEmailsReadyForRetry()
    const results = []
    
    for (const email of emailsToRetry) {
      try {
        let success = false
        let errorMessage = ''
        
        // Attempt to resend the email based on type
        if (email.email_type === 'confirmation') {
          const result = await sendConfirmationEmail(email.content)
          success = result.success
          if (!success) errorMessage = result.error || 'Unknown error'
        } else if (email.email_type === 'error' || email.email_type === 'admin_notification') {
          const result = await sendErrorEmail(email.content)
          success = result.success
          if (!success) errorMessage = result.error || 'Unknown error'
        } else {
          console.warn(`Unknown email type: ${email.email_type}`)
          success = false
          errorMessage = `Unknown email type: ${email.email_type}`
        }
        
        // Update the email record
        await updateEmailAfterRetry(email.id!, success, errorMessage)
        
        results.push({
          id: email.id,
          type: email.email_type,
          recipient: email.recipient_email,
          success,
          error: errorMessage
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Error processing email ${email.id}:`, errorMessage)
        
        await updateEmailAfterRetry(email.id!, false, errorMessage)
        
        results.push({
          id: email.id,
          type: email.email_type,
          recipient: email.recipient_email,
          success: false,
          error: errorMessage
        })
      }
    }
    
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`📧 Email retry complete: ${successful} succeeded, ${failed} failed`)
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error in email retry endpoint:", errorMessage)
    
    return NextResponse.json(
      { error: "Failed to process email retries", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (type === 'email-stats') {
      const stats = await getEmailQueueStats()
      return NextResponse.json(stats)
    }
    
    if (type === 'db-stats') {
      const stats = getDatabaseStats()
      return NextResponse.json(stats)
    }
    
    // Return all stats by default
    const [emailStats, dbStats] = await Promise.all([
      getEmailQueueStats(),
      Promise.resolve(getDatabaseStats())
    ])
    
    return NextResponse.json({
      email: emailStats,
      database: dbStats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error getting monitoring stats:", errorMessage)
    
    return NextResponse.json(
      { error: "Failed to get monitoring stats", details: errorMessage },
      { status: 500 }
    )
  }
}
