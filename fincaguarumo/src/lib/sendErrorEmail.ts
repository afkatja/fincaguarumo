import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"
import { withRetries } from "./monitoring/retry"
import { RETRY_CONFIG } from "./monitoring/config"
import { queueFailedEmail } from "./monitoring/emailQueue"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_TOKEN || "",
})

export async function sendErrorEmail({
  subject,
  error,
  details,
}: {
  subject: string
  error: string
  details?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminMsg = {
      to: process.env.CONTACT_EMAIL!,
      from: {
        email: process.env.MAILERSEND_FROM_EMAIL!,
        name: "Finca Guarumo Error Alert",
      },
      subject,
      text: `Error: ${error}
        
        ${details ? `Details: ${details}` : ""}
        
        Timestamp: ${new Date().toISOString()}`,
      html: `
        <h1>Error Alert</h1>
        <p><strong>Error:</strong> ${error}</p>
        ${details ? `<p><strong>Details:</strong> ${details}</p>` : ""}
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
    }

    const adminEmailConfig = new EmailParams()
      .setFrom(
        new Sender(
          process.env.MAILERSEND_FROM_EMAIL!,
          "Finca Guarumo Error Alert",
        ),
      )
      .setTo([new Recipient(process.env.CONTACT_EMAIL!, "Finca Guarumo")])
      .setSubject(subject)
      .setText(adminMsg.text)
      .setHtml(adminMsg.html)

    const result = await withRetries(
      () => mailerSend.email.send(adminEmailConfig),
      RETRY_CONFIG.email,
      "send-error-email",
    )

    if (result.success) {
      console.log("Email sent to admin")
      return { success: true }
    } else {
      // Queue failed error email for retry
      await queueFailedEmail({
        emailType: "error",
        recipientEmail: process.env.CONTACT_EMAIL || "admin@fincaguarumo.com",
        subject,
        content: { error, details, timestamp: new Date().toISOString() },
        errorMessage: result.error?.message || "Failed to send error email",
      })

      return { success: false, error: result.error?.message }
    }
  } catch (emailError) {
    const errorMessage =
      emailError instanceof Error ? emailError.message : String(emailError)
    console.error("Failed to send error email:", errorMessage)

    // Queue for retry
    await queueFailedEmail({
      emailType: "error",
      recipientEmail: process.env.CONTACT_EMAIL || "admin@fincaguarumo.com",
      subject,
      content: { error, details, timestamp: new Date().toISOString() },
      errorMessage,
    })

    return { success: false, error: errorMessage }
  }
}
