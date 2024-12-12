import Stripe from "stripe"

export async function POST(request: Request, response: Response) {
  const { price, description, fields } = await request.json()

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

  // const checkoutSession = await stripeInstance.checkout.sessions.create({
  //   mode: "payment",
  //   metadata: fields,
  //   success_url: "http://localhost:3000/payment-success",
  // })

  return Response.json({
    clientSecret: paymentIntent.client_secret,
    // metadata: checkoutSession.metadata,
    // [DEV]: For demo purposes only, you should avoid exposing the PaymentIntent ID in the client-side code.
    dpmCheckerLink: `https://dashboard.stripe.com/settings/payment_methods/review?transaction_id=${paymentIntent.id}`,
  })
}
