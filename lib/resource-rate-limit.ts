import type { NextRequest } from 'next/server'
import { createServerClient } from './supabase/server'

export const RATE_LIMIT_COUNT = 20 // Maximum requests per hour
export const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const MIN_REQUEST_SPACING = 3000 // 3 seconds between requests

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt?: number
  error?: string
}

export function getClientIP(request: NextRequest): string {
  // Extract real IP from Vercel's proxy headers
  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // We want the leftmost (original client) IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    const ip = forwarded.split(',')[0].trim()
    return ip
  }

  if (realIP) {
    return realIP
  }

  // Fallback - should rarely happen on Vercel
  const fallback = 'unknown'
  return fallback
}

export async function checkRateLimit(ip: string, options: { count?: number; spacingMs?: number } = {}): Promise<RateLimitResult> {
  const limitCount = options.count ?? RATE_LIMIT_COUNT
  const minSpacing = options.spacingMs ?? MIN_REQUEST_SPACING
  const now = Date.now()
  const supabase = createServerClient()

  try {
    // Get or create rate limit record for this IP
    const { data: existing, error: fetchError } = await supabase
      .from('research_rate_limits')
      .select('*')
      .eq('ip_address', ip)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('[Rate Limit] Database fetch error:', fetchError)
      // Fail open - allow request if database is down
      return { allowed: true, remaining: limitCount - 1 }
    }

    const windowStart = now - RATE_LIMIT_WINDOW

    // No existing record - create first one
    if (!existing) {
      const { error: insertError } = await supabase
        .from('research_rate_limits')
        .insert({
          ip_address: ip,
          request_count: 1,
          last_request_at: new Date(now).toISOString(),
          window_start: new Date(now).toISOString()
        })

      if (insertError) {
        console.error('[Rate Limit] Insert error:', insertError)
        return { allowed: true, remaining: limitCount - 1 }
      }

      return {
        allowed: true,
        remaining: limitCount - 1,
        resetAt: now + RATE_LIMIT_WINDOW
      }
    }

    const lastRequestTime = new Date(existing.last_request_at).getTime()
    const timeSinceLastRequest = now - lastRequestTime
    const recordWindowStart = new Date(existing.window_start).getTime()

    // CHECK 1: Minimum spacing between requests (3 seconds)
    if (timeSinceLastRequest < minSpacing) {
      const waitTime = Math.ceil((minSpacing - timeSinceLastRequest) / 1000)
      return {
        allowed: false,
        remaining: Math.max(0, limitCount - existing.request_count),
        error: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before searching again.`
      }
    }

    // Reset window if it's expired
    if (recordWindowStart < windowStart) {
      const { error: updateError } = await supabase
        .from('research_rate_limits')
        .update({
          request_count: 1,
          last_request_at: new Date(now).toISOString(),
          window_start: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString()
        })
        .eq('ip_address', ip)

      if (updateError) {
        console.error('[Rate Limit] Reset update error:', updateError)
        return { allowed: true, remaining: limitCount - 1 }
      }

      return {
        allowed: true,
        remaining: limitCount - 1,
        resetAt: now + RATE_LIMIT_WINDOW
      }
    }

    // CHECK 2: Total count limit (20 per hour)
    if (existing.request_count >= limitCount) {
      const resetIn = Math.ceil((recordWindowStart + RATE_LIMIT_WINDOW - now) / 1000 / 60)
      return {
        allowed: false,
        remaining: 0,
        resetAt: recordWindowStart + RATE_LIMIT_WINDOW,
        error: `Search limit reached. You can search again in ${resetIn} minute${resetIn > 1 ? 's' : ''}.`
      }
    }

    // Increment counter
    const newCount = existing.request_count + 1

    const { error: updateError } = await supabase
      .from('research_rate_limits')
      .update({
        request_count: newCount,
        last_request_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
      })
      .eq('ip_address', ip)

    if (updateError) {
      console.error('[Rate Limit] Increment update error:', updateError)
      // Still allow the request even if update fails
    }

    return {
      allowed: true,
      remaining: limitCount - newCount,
      resetAt: recordWindowStart + RATE_LIMIT_WINDOW
    }

  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error)
    // Fail open - allow request if something goes wrong
    return { allowed: true, remaining: limitCount - 1 }
  }
}

