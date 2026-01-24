import { NextResponse } from "next/server"
import { bookingAgent } from "@/lib/bookingAgent"

export async function POST(request: Request) {
  const { messages, threadId } = await request.json()

  const response = await bookingAgent.client.chat.complete({
    messages: messages.map((msg: any) => ({
      role: msg.role as "user" | "assistant" | "system" | "tool",
      content: msg.content,
    })),
    model: "open-mistral-nemo",
  })

  return NextResponse.json(response)
}
