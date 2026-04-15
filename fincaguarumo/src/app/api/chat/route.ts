import { streamResponseWithData } from "./streamResponse"
import {
  detectUserIntent,
  getProgressMessage,
  UserIntent,
} from "../../../lib/intent-detection"

export async function POST(request: Request) {
  const { messages, threadId, locale = "en", context } = await request.json()

  // Get the last user message for RAG
  const lastMessage = messages[messages.length - 1]
  const userQuery = lastMessage?.content || ""

  // Send immediate progress indicators based on user query
  const queryForProgress = userQuery.toLowerCase()

  // Create TransformStream and send progress immediately
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Helper function to send progress
  const sendProgress = async (message: string) => {
    const payload = JSON.stringify({ type: "progress", message })
    const progressChunk = `0:${payload}\n`
    await writer.write(new TextEncoder().encode(progressChunk))
  }

  // Detect intent once for both progress and tool filtering
  const userIntent: UserIntent = detectUserIntent(userQuery)
  console.log("Detected intent in route:", userIntent)

  // Send immediate progress based on detected intent
  const sendImmediateProgress = async () => {
    const progressMessage = getProgressMessage(userIntent)
    await sendProgress(progressMessage)
  }

  // Send progress immediately before expensive LLM call
  sendImmediateProgress().catch(error => {
    console.error("Progress send error:", error)
  })

  // Return the streaming response immediately (don't wait for evaluation)
  const streamResponse = new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })

  streamResponseWithData({
    userQuery,
    context,
    locale,
    messages,
    threadId,
    writer,
    userIntent,
  }).catch(error => {
    console.error("🔥 Background LLM failed:", error)
    // Graceful error handling
    writer
      .write(
        new TextEncoder().encode(
          '0:{"type":"progress","message":"Sorry, try again"}\n',
        ),
      )
      .finally(() => writer.close().catch(() => {}))
  })
  return streamResponse
}
