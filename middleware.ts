import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient(request, response)

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url))
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin-only guard — check email directly, no extra DB round-trip
  if (pathname.startsWith('/admin')) {
    if (user?.email !== 'admin@getprimegrade.com') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)',
  ],
}
