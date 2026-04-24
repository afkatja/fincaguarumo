import { NextResponse } from "next/server"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"
import { validateContactForm } from "@/lib/input-validation"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
})

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    // Validate and sanitize input
    const validation = validateContactForm({ name, email, message })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validation.error,
        },
        { status: 400 },
      )
    }

    const sanitizedData = validation.sanitizedValue!

    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL!,
      "Finca Guarumo Contact Form",
    )
    const recipient = new Recipient(process.env.CONTACT_EMAIL!, "Finca Guarumo")

    // Create safe HTML content with sanitized data
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitizedData.name}</p>
      <p><strong>Email:</strong> ${sanitizedData.email}</p>
      <p><strong>Message:</strong></p>
      <p>${sanitizedData.message}</p>
    `

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([recipient])
      .setReplyTo(new Recipient(sanitizedData.email, sanitizedData.name))
      .setSubject("New Contact Form Submission")
      .setHtml(htmlContent)

    await mailerSend.email.send(emailParams)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending email:", (error as Error)?.message)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    )
  }
}
