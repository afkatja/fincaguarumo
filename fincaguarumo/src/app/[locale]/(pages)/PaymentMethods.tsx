import React from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import Icon from "@/components/Icon"

const possiblePaymentMethods = [
  { type: "card" },
  { type: "ideal" },
  { type: "paypal" },
]

const PaymentMethods = ({ onCheck }: { onCheck: (val: string) => void }) => {
  const paymentMethods = [
    {
      name: "credit card",
      value: "card",
      icon: "CreditCard",
    },
    {
      name: "paypal",
      value: "paypal",
      icon: "WalletCards",
    },
  ]

  return (
    <>
      <Label htmlFor="payment">Payment Method</Label>
      <RadioGroup defaultValue="card" onValueChange={val => onCheck(val)}>
        <div className="flex items-center gap-4">
          {paymentMethods.map(method => (
            <Label
              key={crypto.randomUUID()}
              htmlFor={method.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <RadioGroupItem
                id={method.value}
                value={method.value}
                className="dark:border-zinc-50 data-[state=checked]:text-zinc-900 dark:data-[state=checked]:text-zinc-50"
              />
              <Icon
                icon={method.icon}
                className="h-6 w-6 dark:stroke-zinc-50"
              />
              {method.name}
            </Label>
          ))}
        </div>
      </RadioGroup>
    </>
  )
}

export default PaymentMethods
