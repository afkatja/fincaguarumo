import { NextResponse } from 'next/server'
import { listAccounts } from '@/lib/gbp/client'

export const revalidate = 0

export async function GET() {
  try {
    const accounts = await listAccounts(true)
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('GBP accounts error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    )
  }
}