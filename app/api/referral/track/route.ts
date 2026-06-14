import { NextResponse, type NextRequest } from 'next/server'
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_DAYS } from '@/lib/referral'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to set referral cookie
 * Called from client-side when ?ref= parameter is detected
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    // Set cookie that expires in 30 days
    const maxAge = REFERRAL_COOKIE_DAYS * 24 * 60 * 60 // seconds
    response.cookies.set(REFERRAL_COOKIE_NAME, code.toUpperCase(), {
      maxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (err) {
    console.error('[referral/track]:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
