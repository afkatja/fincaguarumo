import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"

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
}) {
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

    await mailerSend.email.send(adminEmailConfig)
    console.log("Error email sent to admin")
  } catch (emailError) {
    console.error("Failed to send error email:", emailError)
  }
}
