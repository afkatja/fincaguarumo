import { NextResponse } from "next/server"
import { IBookingType } from "../../../types"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"

import { calculateTotal } from "../../../components/priceCalculation"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
})

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
        email: process.env.MAILERSEND_FROM_EMAIL!,
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
      to: process.env.CONTACT_EMAIL!,
      from: {
        email: process.env.MAILERSEND_FROM_EMAIL!,
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
                bookingDetails.price,
                bookingDetails.guests,
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

    const customerEmailConfig = new EmailParams()
      .setFrom(new Sender(process.env.MAILERSEND_FROM_EMAIL!, "Finca Guarumo"))
      .setTo([new Recipient(customerDetails.email, customerDetails.name)])
      .setSubject(`Your Finca Guarumo ${getBookingType()} Booking Confirmation`)
      .setText(customerMsg.text)
      .setHtml(customerMsg.html)

    const adminEmailConfig = new EmailParams()
      .setFrom(
        new Sender(
          process.env.MAILERSEND_FROM_EMAIL!,
          "Finca Guarumo Booking System"
        )
      )
      .setTo([new Recipient(process.env.CONTACT_EMAIL!, "Finca Guarumo")])
      .setSubject(`New ${getBookingType()} Booking Received`)
      .setText(adminMsg.text)
      .setHtml(adminMsg.html)

    // Validate required environment variables
    if (!process.env.MAILERSEND_API_KEY) {
      throw new Error("MAILERSEND_API_KEY is not configured")
    }
    if (!process.env.MAILERSEND_FROM_EMAIL) {
      throw new Error("MAILERSEND_FROM_EMAIL is not configured")
    }
    if (!process.env.CONTACT_EMAIL) {
      throw new Error("CONTACT_EMAIL is not configured")
    }

    try {
      await Promise.all([
        mailerSend.email.send(customerEmailConfig),
        mailerSend.email.send(adminEmailConfig),
      ])
    } catch (error: any) {
      console.error("Detailed MAILERSEND Error:", {
        error: error.body,
      })
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("MAILERSEND Error:", {
      error: error.body,
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
