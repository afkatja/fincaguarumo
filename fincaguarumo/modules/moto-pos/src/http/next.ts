import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { HandleChargeOptions } from './handleChargeRequest'
import { handleChargeRequest } from './handleChargeRequest'

export function createNextRouteHandler(options: HandleChargeOptions) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const httpRequest = {
      method: req.method,
      headers: req.headers,
      json: () => req.json(),
    }

    const result = await handleChargeRequest(httpRequest, options)

    return NextResponse.json(result.body, { status: result.status })
  }
}