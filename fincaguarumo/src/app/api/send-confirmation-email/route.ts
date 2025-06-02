import { NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"
import { IBookingType } from "../../../types"
import { calculateTotal } from "../../../components/priceCalculation"

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not set")
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export async function POST(request: Request) {
  try {
    const { customerDetails, bookingDetails } = await request.json()

    const getBookingType = () => {
      return bookingDetails.type === IBookingType.villa ? "Villa" : "Tour"
    }

    const getBookingDetails = () => {
      const commonDetails = `
        <li>Date: ${bookingDetails.date}</li>
        <li>Number of Guests: ${bookingDetails.guests}</li>
        <li>Total Amount: $${Number(bookingDetails.totalPrice)}</li>
      `

      if (bookingDetails.type === IBookingType.villa) {
        return `
          <li>Check-in: ${bookingDetails.checkIn}</li>
          <li>Check-out: ${bookingDetails.checkOut}</li>
          ${commonDetails}
        `
      }

      return `
        <li>Tour: ${bookingDetails.title}</li>
        <li>Location: ${bookingDetails.location}</li>
        ${commonDetails}
      `
    }

    const customerMsg = {
      to: customerDetails.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: "Finca Guarumo",
      },
      subject: `Your Finca Guarumo ${getBookingType()} Booking Confirmation`,
      text: `Dear ${customerDetails.name},

Thank you for booking your ${getBookingType().toLowerCase()} with Finca Guarumo!

Booking Details:
${
  bookingDetails.type === IBookingType.villa
    ? `- Check-in: ${bookingDetails.checkIn}
- Check-out: ${bookingDetails.checkOut}`
    : `- Tour: ${bookingDetails.title}
- Location: ${bookingDetails.location}`
}
- Date: ${bookingDetails.date}
- Number of Guests: ${bookingDetails.guests}
- Total Amount: $${Number(bookingDetails.price) * Number(bookingDetails.guests)}

We look forward to welcoming you!

Best regards,
Finca Guarumo Team`,
      html: `
        <h1>${getBookingType()} Booking Confirmation</h1>
        <p>Dear ${customerDetails.name},</p>
        <p>Thank you for booking your ${getBookingType().toLowerCase()} with Finca Guarumo!</p>
        <h2>Booking Details:</h2>
        <ul>
          ${getBookingDetails()}
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
      subject: `New ${getBookingType()} Booking Received`,
      text: `New ${getBookingType().toLowerCase()} booking received:

Customer Details:
- Name: ${customerDetails.name}
- Email: ${customerDetails.email}

Booking Details:
${
  bookingDetails.type === IBookingType.villa
    ? `- Check-in: ${bookingDetails.checkIn}
       - Check-out: ${bookingDetails.checkOut}`
    : `- Tour: ${bookingDetails.title}
       - Location: ${bookingDetails.location}
       - Date: ${bookingDetails.date}`
}
      - Number of Guests: ${bookingDetails.guests}
      - Total Amount: $${calculateTotal(
        Number(bookingDetails.price),
        Number(bookingDetails.guests),
        bookingDetails.type
      )}`,
      html: `
        <h1>New ${getBookingType()} Booking Received</h1>
        <h2>Customer Details:</h2>
        <ul>
          <li>Name: ${customerDetails.name}</li>
          <li>Email: ${customerDetails.email}</li>
        </ul>
        <h2>Booking Details:</h2>
        <ul>
          ${getBookingDetails()}
        </ul>
      `,
    }

    const [customerResponse, adminResponse] = await Promise.all([
      sgMail.send(customerMsg),
      sgMail.send(adminMsg),
    ])

    // console.log("SendGrid Responses:", { customerResponse, adminResponse })
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
