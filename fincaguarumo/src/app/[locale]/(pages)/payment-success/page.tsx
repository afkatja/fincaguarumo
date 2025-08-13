import React from "react"
import PaymentCompletePage from "./PaymentCompletePage"

const PaymentSuccess = async ({ params }: { params: any }) => {
  const { locale } = await params

  return <PaymentCompletePage />
}

export default PaymentSuccess
