import { NextResponse } from 'next/server'
import { fetchLocations } from '@/lib/gbp/client'

export const revalidate = 3600

export async function GET() {
  try {
    const locations = await fetchLocations()

    const simplifiedLocations = locations.map(loc => ({
      name: loc.name,
      title: loc.title,
      address: loc.address
        ? [
            ...(loc.address.addressLines || []),
            loc.address.locality,
            loc.address.administrativeArea,
            loc.address.postalCode,
            loc.address.regionCode,
          ]
            .filter(Boolean)
            .join(', ')
        : undefined,
      phoneNumber: loc.phoneNumber,
    }))

    return NextResponse.json(
      { locations: simplifiedLocations },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
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