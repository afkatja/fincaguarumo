import React from "react"
import Stripe from "stripe"

const Payment = async ({
  price,
  paymentMethod,
}: {
  price: number
  paymentMethod: string
}) => {
  const stripeInstance = new Stripe(
    "sk_test_51QPE2rKrlqDRfFCKOEHxh8i7emDlAccdF0x6KJJSYMU31GitSriXmIVspvPEx4DvKCQpmpCRCrY0qPjVRKS0WlUD00gArUJc7H"
  )
  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount: price * 100,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    confirm: true,
    payment_method: paymentMethod,
  })

  return <div>Payment</div>
}

export default Payment
