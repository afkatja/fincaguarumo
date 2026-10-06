import { NextRequest, NextResponse } from 'next/server'
import { listInvitations, acceptInvitation } from '@/lib/gbp/client'

export const revalidate = 0

export async function GET() {
  try {
    const invitations = await listInvitations()
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('GBP invitations error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { invitationName } = await request.json()
    if (!invitationName) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'invitationName is required' } },
        { status: 400 }
      )
    }
    await acceptInvitation(invitationName)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GBP accept invitation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    )
  }
}