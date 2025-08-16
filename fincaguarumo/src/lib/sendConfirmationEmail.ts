import { NextResponse } from "next/server"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"
import calculateTotal from "@/lib/calculateTotal"
import calculateDuration from "@/lib/calculateDuration"
import { BOOKING_TYPE, BookingData } from "../types"

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_TOKEN || "",
})

export async function sendConfirmationEmail({
  customerDetails,
  bookingDetails,
}: BookingData) {
  if (!customerDetails || !bookingDetails) {
    throw new Error("Missing customer or booking details")
  }
  try {
    const getBookingType = () => {
      return bookingDetails.type === BOOKING_TYPE.villa ? "Villa" : "Tour"
    }

    const getBookingDetails = () => {
      const commonDetails = `
        <li>Date: ${bookingDetails.date}</li>
        <li>Number of Guests: ${bookingDetails.guests}</li>
        <li>Total Amount: $${bookingDetails.totalPrice}</li>      `

      if (bookingDetails.type === BOOKING_TYPE.villa) {
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
      subject:
        bookingDetails.type === BOOKING_TYPE.villa
          ? "Your reservation at Villa Bruno is confirmed!"
          : `Your Finca Guarumo ${getBookingType()} Booking Confirmation`,
      text: `Dear ${customerDetails.name},

            Thank you for booking your ${getBookingType().toLowerCase()} with Finca Guarumo!

            Booking Details:
            ${
              bookingDetails.type === BOOKING_TYPE.villa
                ? `- Check-in: ${bookingDetails.checkIn}
                  - Check-out: ${bookingDetails.checkOut}`
                : `- Tour: ${bookingDetails.title}
            - Location: ${bookingDetails.location}`
            }
            - Date: ${bookingDetails.date}
            - Number of Guests: ${bookingDetails.guests}
            - Total Amount: $${bookingDetails.totalPrice}

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
            - Phone: ${customerDetails.phoneNumber}

            Booking Details:
            ${
              bookingDetails.type === BOOKING_TYPE.villa
                ? `- Check-in: ${bookingDetails.checkIn}
              - Check-out: ${bookingDetails.checkOut}`
                : `- Tour: ${bookingDetails.title}
              - Location: ${bookingDetails.location}
              - Date: ${bookingDetails.date}`
            }
              - Number of Guests: ${bookingDetails.guests}
              - Total Amount: $${bookingDetails.totalPrice}`,
      html: `
              <h1>New ${getBookingType()} Booking Received</h1>
              <h2>Customer Details:</h2>
              <ul>
                <li>Name: ${customerDetails.name}</li>
                <li>Email: ${customerDetails.email}</li>
                <li>Phone: ${customerDetails.phoneNumber}</li>
              </ul>
              <h2>Booking Details:</h2>
              <ul>
                ${getBookingDetails()}
              </ul>
            `,
    }

    const customerEmailConfig = new EmailParams(customerMsg)
      .setFrom(new Sender(process.env.MAILERSEND_FROM_EMAIL!, "Finca Guarumo"))
      .setTo([new Recipient(customerDetails.email, customerDetails.name)])
      .setSubject(`Your Finca Guarumo ${getBookingType()} Booking Confirmation`)
      .setTemplateId(
        bookingDetails.type === BOOKING_TYPE.villa
          ? "z3m5jgry77m4dpyo"
          : "yzkq340kvv6gd796"
      )
      .setPersonalization([
        {
          email: customerDetails.email!,
          data: {
            account_name: "Finca Guarumo",
            account_slogan: "Forest of birds",
            account_website: "https://fincaguarumo.com",
            account_email: process.env.MAILERSEND_FROM_EMAIL!,
            account_phone: process.env.CONTACT_PHONE!,
            account_address: "Calle La Balsa, Puerto Jimenez, Costa Rica",
            account_logo: "https://fincaguarumo.com/logo.png",
            account_logo_single: "https://fincaguarumo.com/logo-single.png",
            name: customerDetails.name,
            total_price: `$${bookingDetails.totalPrice}`,
            guests_number: bookingDetails.guests,
            support_mail: process.env.CONTACT_EMAIL!,
            ...(bookingDetails.type === BOOKING_TYPE.villa
              ? {
                  checkin: bookingDetails.checkIn,
                  checkout: bookingDetails.checkOut,
                }
              : {
                  tour_name: bookingDetails.title,
                  location: bookingDetails.location,
                  date: bookingDetails.date,
                }),
          },
        },
      ])
    // .setText(customerMsg.text)
    // .setHtml(customerMsg.html)

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
    if (!process.env.MAILERSEND_API_KEY && !process.env.MAILERSEND_TOKEN) {
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
        error: error.message,
      })
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("MAILERSEND Error:", {
      error: error.message,
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
