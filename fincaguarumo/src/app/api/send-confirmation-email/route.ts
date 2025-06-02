import { NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set")
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export async function POST(request: Request) {
  try {
    const { customerDetails, tourDetails } = await request.json()

    const customerMsg = {
      to: customerDetails.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: "Finca Guarumo",
      },
      subject: "Your Finca Guarumo Tour Confirmation",
      text: `Dear ${customerDetails.name},

        Thank you for booking your tour with Finca Guarumo!

        Tour Details:
        - Date: ${tourDetails.date}
        - Number of Guests: ${tourDetails.guests}
        - Total Amount: $${Number(tourDetails.price) * Number(tourDetails.guests)}

        We look forward to welcoming you!

        Best regards,
        Finca Guarumo Team`,
      html: `
        <h1>Booking Confirmation</h1>
        <p>Dear ${customerDetails.name},</p>
        <p>Thank you for booking your tour with Finca Guarumo!</p>
        <h2>Booking Details:</h2>
        <ul>
          <li>Date: ${tourDetails.date}</li>
          <li>Number of Guests: ${tourDetails.guests}</li>
          <li>Total Amount: $${Number(tourDetails.price) * Number(tourDetails.guests)}</li>
        </ul>
        <p>We look forward to welcoming you!</p>
        <p>Best regards,<br>Finca Guarumo Team</p>
      `,
    }

    const adminMsg = {
      to: process.env.ADMIN_EMAIL!,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: "Finca Guarumo Booking System",
      },
      subject: "New Booking Received",
      text: `New booking received:

Customer Details:
- Name: ${customerDetails.name}
- Email: ${customerDetails.email}

Tour Details:
- Tour: ${tourDetails.title}
- Date: ${tourDetails.date}
- Number of Guests: ${tourDetails.guests}
- Total Amount: $${Number(tourDetails.price) * Number(tourDetails.guests)}
- Location: ${tourDetails.location}`,
      html: `
        <h1>New Booking Received</h1>
        <h2>Customer Details:</h2>
        <ul>
          <li>Name: ${customerDetails.name}</li>
          <li>Email: ${customerDetails.email}</li>
        </ul>
        <h2>Tour Details:</h2>
        <ul>
          <li>Tour: ${tourDetails.title}</li>
          <li>Date: ${tourDetails.date}</li>
          <li>Number of Guests: ${tourDetails.guests}</li>
          <li>Total Amount: $${Number(tourDetails.price) * Number(tourDetails.guests)}</li>
          <li>Location: ${tourDetails.location}</li>
        </ul>
      `,
    }

    const [customerResponse, adminResponse] = await Promise.all([
      sgMail.send(customerMsg),
      sgMail.send(adminMsg),
    ])

    console.log("SendGrid Responses:", { customerResponse, adminResponse })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("SendGrid Error:", {
      message: error.message,
      code: error.code,
      response: error.response?.body,
    })
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error.response?.body || error.message,
      },
      { status: 500 }
    )
  }
}
