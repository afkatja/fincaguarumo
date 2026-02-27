import { sendConfirmationEmail } from "../src/lib/sendConfirmationEmail.js"

async function main() {
  const metadata = {
    description: "Machen Sie Ihren Aufenthalt im Dschungel unvergesslich",
    geo: '{"lat":0,"lng":0}',
    type: "villa",
    duration: "0",
    price: "115",
    customerName: process.env.CUSTOMER_NAME || "",
    customerEmail: process.env.CUSTOMER_EMAIL || "",
    totalPrice: "460",
    date: "2026-01-22T14:40:54.577Z",
    checkOut: "2026-02-27T23:00:00.000Z",
    checkIn: "2026-02-23T23:00:00.000Z",
    currency: "usd",
    title: "Villa Bruno",
    guests: "1",
    location: "Finca Guarumo",
    customerPhone: process.env.CUSTOMER_PHONE || "",
    body: "",
  }

  const customerDetails = {
    name: metadata.customerName || "",
    email: metadata.customerEmail || "",
    phoneNumber: metadata.customerPhone || "",
  }

  const bookingDetails = {
    type: metadata.type || "",
    title: metadata.title || "",
    description: metadata.description || "",
    duration: Number(metadata.duration) || 0,
    location: metadata.location || "",
    body: metadata.body || "",
    date: new Date(metadata.date || ""),
    checkIn: new Date(metadata.checkIn || ""),
    checkOut: new Date(metadata.checkOut || ""),
    price: Number(metadata.price) || 0,
    basePrice: Number(metadata.price) || 0, // Use price as basePrice for email script
    totalPrice: (metadata.totalPrice as unknown as number) || 0,
    currency: metadata.currency || "USD",
    guests: Number(metadata.guests) || 0,
    geo: metadata.geo ? JSON.parse(metadata.geo) : {},
  }

  const res = await sendConfirmationEmail({
    customerDetails,
    bookingDetails,
    pricingRules: [], // Email script doesn't need pricingRules, but it's required by BookingData type
  })
  console.log("Email result:", res)
}

main().catch(console.error)
