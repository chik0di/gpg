import { NextRequest } from 'next/server'

/**
 * Get the origin (protocol + host) from the current request.
 * Works in both server-side (API routes, middleware) and client-side contexts.
 *
 * This ensures auth redirects and email links work correctly in all environments:
 * - localhost during development
 * - Vercel preview deployments (unique URLs per PR)
 * - Production domain
 *
 * Note: Supabase's allowed redirect URLs still need each domain configured in the dashboard.
 */

/**
 * Server-side: Extract origin from Next.js request
 * Handles Vercel's proxy headers correctly
 */
export function getOriginFromRequest(request: NextRequest): string {
  // Try URL first (most reliable)
  const url = new URL(request.url)
  if (url.origin && url.origin !== 'null') {
    return url.origin
  }

  // Fallback: construct from headers
  // Vercel sets x-forwarded-proto and x-forwarded-host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (host) {
    return `${proto}://${host}`
  }

  // Last resort fallback (should never happen on Vercel)
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://getprimegrade.com'
}

/**
 * Client-side: Get origin from window.location
 */
export function getOriginFromWindow(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOriginFromWindow() can only be called client-side')
  }
  return window.location.origin
}

/**
 * Universal helper that works in any context
 * Pass the request if available (server-side), otherwise uses window (client-side)
 */
export function getOrigin(request?: NextRequest): string {
  if (request) {
    return getOriginFromRequest(request)
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Server-side without request (e.g., in email templates)
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://getprimegrade.com'
}
