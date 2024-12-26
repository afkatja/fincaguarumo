import { NextRequest } from "next/server"
import Stripe from "stripe"
import getRequestBody from "../../../lib/getRequestBody"

export async function POST(request: NextRequest) {
  const { customerDetails, tourDetails } = await getRequestBody(request)

  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

  const customer = await stripeInstance.customers.create({
    name: customerDetails.name,
    email: customerDetails.email,
  })
  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount: tourDetails.price * 100,
    currency: "usd",
    description: tourDetails.description,
    customer: customer.id,
    setup_future_usage: "off_session",
    receipt_email: customerDetails.email,
    automatic_payment_methods: {
      enabled: true,
      // allow_redirects: 'never'
    },
    // confirm: true,
    // return_url: "http://localhost:3000/payment-success",
    // payment_method: paymentMethod,
  })

  return Response.json({
    clientSecret: paymentIntent.client_secret,
    dpmCheckerLink: `https://dashboard.stripe.com/settings/payment_methods/review?transaction_id=${paymentIntent.id}`,
  })

  // const checkoutSession = await stripeInstance.checkout.sessions.create({
  //   mode: "payment",
  //   metadata: fields,
  //   success_url: "http://localhost:3000/payment-success",
  // })
}
