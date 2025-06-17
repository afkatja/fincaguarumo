import { NextResponse } from "next/server"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
})

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL!,
      "Finca Guarumo Contact Form"
    )
    const recipient = new Recipient(process.env.CONTACT_EMAIL!, "Finca Guarumo")

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([recipient])
      .setReplyTo(new Recipient(email, name))
      .setSubject("New Contact Form Submission").setHtml(`
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `)

    await mailerSend.email.send(emailParams)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
