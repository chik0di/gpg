import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createMiddlewareClient(request, response)
  await supabase.auth.signOut()
  return response
}
