import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Exchange the OAuth code for a session and set the auth cookies on the response
  const response = NextResponse.redirect(`${origin}${next}`)
  const supabase = createMiddlewareClient(request, response)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

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

  return response
}
