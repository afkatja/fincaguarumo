import { NextRequest } from "next/server"

export default async function getRequestBody(request: NextRequest) {
  const requestClone = request.clone()
  const body = await requestClone.json()

  return body
}
