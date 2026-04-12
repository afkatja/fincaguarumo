import { createSupabaseAdmin } from '@/lib/auth'
import { FailedEmailRecord } from './types'
import { RETRY_CONFIG } from './config'

/**
 * Adds a failed email to the queue for retry
 */
export async function queueFailedEmail({
  emailType,
  recipientEmail,
  subject,
  content,
  errorMessage,
  maxRetries = 3
}: {
  emailType: string
  recipientEmail: string
  subject?: string
  content: any
  errorMessage: string
  maxRetries?: number
}): Promise<void> {
  try {
    const supabase = createSupabaseAdmin()
    const nextRetryAt = new Date(Date.now() + RETRY_CONFIG.email.baseDelay)
    
    const { error } = await supabase
      .from('failed_emails')
      .insert({
        email_type: emailType,
        recipient_email: recipientEmail,
        subject,
        content,
        error_message: errorMessage,
        retry_count: 0,
        max_retries: maxRetries,
        next_retry_at: nextRetryAt.toISOString()
      })
    
    if (error) {
      console.error('Failed to queue email for retry:', error)
    } else {
      console.log(`📧 Queued failed ${emailType} email for ${recipientEmail} - retry at ${nextRetryAt.toISOString()}`)
    }
  } catch (error) {
    console.error('Error queuing failed email:', error)
  }
}

/**
 * Retrieves emails that are ready for retry
 */
export async function getEmailsReadyForRetry(): Promise<FailedEmailRecord[]> {
  try {
    const supabase = createSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('failed_emails')
      .select('*')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', 'max_retries')
      .order('created_at', { ascending: true })
      .limit(10)
    
    if (error) {
      console.error('Failed to retrieve emails for retry:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error retrieving emails for retry:', error)
    return []
  }
}

/**
 * Updates email record after retry attempt
 */
export async function updateEmailAfterRetry(
  emailId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = createSupabaseAdmin()
    
    if (success) {
      // Remove successful email from queue
      const { error } = await supabase
        .from('failed_emails')
        .delete()
        .eq('id', emailId)
      
      if (error) {
        console.error('Failed to remove successful email from queue:', error)
      } else {
        console.log(`✅ Email ${emailId} succeeded and removed from queue`)
      }
    } else {
      // Update retry count and schedule next retry
      const emailRecord = await supabase
        .from('failed_emails')
        .select('retry_count, max_retries')
        .eq('id', emailId)
        .single()
      
      if (emailRecord.data) {
        const newRetryCount = emailRecord.data.retry_count + 1
        
        if (newRetryCount >= emailRecord.data.max_retries) {
          // Max retries reached, remove from queue
          await supabase
            .from('failed_emails')
            .delete()
            .eq('id', emailId)
          
          console.error(`💥 Email ${emailId} failed after ${emailRecord.data.max_retries} retries - giving up`)
        } else {
          // Schedule next retry
          const nextRetryDelay = RETRY_CONFIG.email.baseDelay * Math.pow(2, newRetryCount)
          const nextRetryAt = new Date(Date.now() + nextRetryDelay)
          
          const { error: updateError } = await supabase
            .from('failed_emails')
            .update({
              retry_count: newRetryCount,
              error_message: errorMessage || 'Retry failed',
              next_retry_at: nextRetryAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', emailId)
          
          if (updateError) {
            console.error('Failed to update email retry record:', updateError)
          } else {
            console.log(`🔄 Email ${emailId} retry ${newRetryCount}/${emailRecord.data.max_retries} scheduled for ${nextRetryAt.toISOString()}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating email after retry:', error)
  }
}

/**
 * Gets statistics about failed emails
 */
export async function getEmailQueueStats(): Promise<{
  totalQueued: number
  readyToRetry: number
  failedPermanent: number
}> {
  try {
    const supabase = createSupabaseAdmin()
    
    const [{ count: totalQueued }, { count: readyToRetry }, { count: failedPermanent }] = await Promise.all([
      supabase
        .from('failed_emails')
        .select('id', { count: 'exact', head: true }),
      
      supabase
        .from('failed_emails')
        .select('id', { count: 'exact', head: true })
        .lte('next_retry_at', new Date().toISOString())
        .lt('retry_count', 'max_retries'),
      
      supabase
        .from('failed_emails')
        .select('id', { count: 'exact', head: true })
        .gte('retry_count', 'max_retries')
    ])
    
    return {
      totalQueued: totalQueued || 0,
      readyToRetry: readyToRetry || 0,
      failedPermanent: failedPermanent || 0
    }
  } catch (error) {
    console.error('Error getting email queue stats:', error)
    return { totalQueued: 0, readyToRetry: 0, failedPermanent: 0 }
  }
}
