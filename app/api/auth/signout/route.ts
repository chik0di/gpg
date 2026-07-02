import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

async function handleSignOut(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createMiddlewareClient(request, response)
  await supabase.auth.signOut()
  return response
}

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}

export async function GET(request: NextRequest) {
  return handleSignOut(request)
}
