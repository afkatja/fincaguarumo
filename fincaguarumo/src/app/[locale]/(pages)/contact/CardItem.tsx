import React from "react"
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
  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="border w-12 h-12">
            <AvatarImage src={avatar} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h1 className="mb-0">{name}</h1>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Icon icon="Mail" className="w-5 h-5 text-muted-foreground" />
            <a href="#" className="text-sm font-medium hover:underline">
              {email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Icon icon="Phone" className="w-5 h-5 text-muted-foreground" />
            <a href="#" className="text-sm font-medium hover:underline">
              {phoneNumber}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardItem
