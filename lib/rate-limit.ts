/**
 * Simple in-memory rate limiter for Vercel serverless functions
 * Uses LRU cache with automatic cleanup
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (shared across requests in the same serverless instance)
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number
  /**
   * Time window in seconds
   */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const key = identifier

  const entry = store.get(key)

  // No existing entry or window expired - create new
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    }
  }

  // Window still active - increment count
  entry.count++

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers (works with Vercel)
 */
export function getClientIp(request: Request): string {
  // Vercel provides x-forwarded-for and x-real-ip
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback (shouldn't happen on Vercel)
  return 'unknown'
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  /** Strict - 5 requests per minute (for sensitive operations like order creation) */
  strict: { limit: 5, windowSeconds: 60 },
  /** Moderate - 10 requests per minute (for contact forms, auth) */
  moderate: { limit: 10, windowSeconds: 60 },
  /** Relaxed - 30 requests per minute (for admin operations) */
  relaxed: { limit: 30, windowSeconds: 60 },
} as const
