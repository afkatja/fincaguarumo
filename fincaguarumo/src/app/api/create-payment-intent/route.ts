import Stripe from "stripe"

export async function POST(request: Request, response: Response) {
  const { price } = await request.json()

  const stripeInstance = new Stripe(process.env.STRIPE_API_KEY ?? "")
  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount: price * 100,
    currency: "usd",
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
    // [DEV]: For demo purposes only, you should avoid exposing the PaymentIntent ID in the client-side code.
    dpmCheckerLink: `https://dashboard.stripe.com/settings/payment_methods/review?transaction_id=${paymentIntent.id}`,
  })
}
