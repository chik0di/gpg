import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createReferralCodeForUser, createReferral, REFERRAL_COOKIE_NAME } from '@/lib/referral'

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = safeNext(searchParams.get('next'))

  console.log('[auth/callback] Received next parameter from URL:', searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // For email confirmation flow, the next parameter might not be in the URL
  // Check if we have a stored next parameter in the redirect chain
  // We'll handle this after session is established

  // Exchange the OAuth code for a session and set the auth cookies on the response
  const response = NextResponse.redirect(`${origin}${next}`)
  const supabase = createMiddlewareClient(request, response)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log('[auth/callback] Session exchange result:', error ? 'error' : 'success')

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Upsert the profile using the service-role client so this always succeeds
  // regardless of RLS policies or session-cookie timing issues.
  // ignoreDuplicates: true means returning users keep their existing profile intact.
  const { user } = data
  const meta      = user.user_metadata ?? {}

  const firstName =
    meta.given_name  ??
    meta.first_name  ??
    (typeof meta.full_name === 'string' ? meta.full_name.split(' ')[0] : null) ??
    ''

  const lastName =
    meta.family_name ??
    meta.last_name   ??
    (typeof meta.full_name === 'string' ? meta.full_name.split(' ').slice(1).join(' ') : null) ??
    ''

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id:         user.id,
        email:      user.email ?? meta.email ?? '',
        first_name: firstName,
        last_name:  lastName,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (profileError) {
    // Log but don't block — the DB trigger is the safety net
    console.error('[auth/callback] profile upsert failed:', profileError.message)
  }

  // Generate referral code for new users (fire-and-forget)
  createReferralCodeForUser(supabaseAdmin, user.id).catch((err) => {
    console.error('[auth/callback] referral code generation failed:', err)
  })

  // Check for referral cookie and create referral relationship
  const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value
  if (referralCode) {
    createReferral(supabaseAdmin, referralCode, user.id).catch((err) => {
      console.error('[auth/callback] referral creation failed:', err)
    })
  }

  console.log('[auth/callback] Redirecting to:', next)
  return response
}
