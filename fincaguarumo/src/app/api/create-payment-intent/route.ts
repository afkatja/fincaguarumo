import { NextRequest } from "next/server"
import Stripe from "stripe"

async function getRequestBody(request: NextRequest) {
  const requestClone = request.clone()
  const body = await requestClone.json()

  return body
}

export async function POST(request: NextRequest) {
  const { price, description, fields } = await getRequestBody(request)

  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")

  const customer = await stripeInstance.customers.create({
    name: fields.name,
    email: fields.email,
  })
  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount: price * 100,
    currency: "usd",
    description,
    metadata: fields,
    customer: customer.id,
    setup_future_usage: "off_session",
    receipt_email: fields.email,
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
