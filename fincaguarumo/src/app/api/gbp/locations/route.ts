import { NextResponse } from 'next/server'
import { fetchLocations } from '@/lib/gbp/client'

export const revalidate = 3600

export async function GET() {
  try {
    const locations = await fetchLocations(false) // use OAuth

    return NextResponse.json(
      { locations },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
          'X-Cache-Tags': 'gbp-locations',
        },
      }
    )
  } catch (error) {
    console.error('GBP locations error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    )
  }
}