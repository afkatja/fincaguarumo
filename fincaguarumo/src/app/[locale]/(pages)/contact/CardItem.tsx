"use client"
import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import Icon from "../../../../components/Icon"

const CardItem = ({
  name,
  avatar,
  phoneNumber,
  email,
}: {
  name: string
  phoneNumber: string
  email: string
  avatar?: string
}) => {
  const [emailDecoded, setEmailDecoded] = useState(email)
  const [phoneDecoded, setPhoneDecoded] = useState(email)
  useEffect(() => {
    setEmailDecoded(atob(email))
    setPhoneDecoded(atob(phoneNumber))
  }, [email, phoneNumber])
  return (
    <Card>
      <CardContent className="grid grid-flow-col auto-cols-min items-center gap-4 p-5">
        <Avatar className="block border w-24 h-24">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-2">
          <h1 className="mb-0">{name}</h1>
          <div className="flex items-center gap-2">
            <Icon icon="Mail" className="w-5 h-5 text-muted-foreground" />
            <a
              href={`mailto:${emailDecoded}`}
              className="text-sm font-medium fancy-underline"
            >
              {emailDecoded}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Icon icon="Phone" className="w-5 h-5 text-muted-foreground" />
            <a
              href={`tel:${phoneDecoded}`}
              className="text-sm font-medium fancy-underline"
            >
              {phoneDecoded}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardItem
