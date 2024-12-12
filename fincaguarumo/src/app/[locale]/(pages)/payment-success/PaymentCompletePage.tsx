"use client"
import React from "react"
import PaymentComplete from "./PaymentComplete"
import PaymentWrapper from "../(payment)/PaymentWrapper"

const PaymentCompletePage = ({ locale }: { locale: string }) => {
  return (
    <PaymentWrapper>
      <PaymentComplete locale={locale} />
    </PaymentWrapper>
  )
}

export default PaymentCompletePage
