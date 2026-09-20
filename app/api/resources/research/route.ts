import { NextRequest, NextResponse } from 'next/server'
import { searchAcademicPapers } from '@/lib/research-materials'
import { createServerClient } from '@/lib/supabase/server'

const RATE_LIMIT_COUNT = 20 // Maximum requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const MIN_REQUEST_SPACING = 3000 // 3 seconds between requests

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt?: number
  error?: string
}

function getClientIP(request: NextRequest): string {
  // Extract real IP from Vercel's proxy headers
  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // We want the leftmost (original client) IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    const ip = forwarded.split(',')[0].trim()
    console.log('[Rate Limit] IP from x-forwarded-for:', ip)
    return ip
  }

  if (realIP) {
    console.log('[Rate Limit] IP from x-real-ip:', realIP)
    return realIP
  }

  // Fallback - should rarely happen on Vercel
  const fallback = 'unknown'
  console.log('[Rate Limit] No IP headers found, using fallback:', fallback)
  return fallback
}

async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const now = Date.now()
  const supabase = createServerClient()

  try {
    console.log('[Rate Limit] Checking rate limit for IP:', ip)

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
      return { allowed: true, remaining: RATE_LIMIT_COUNT - 1 }
    }

    const windowStart = now - RATE_LIMIT_WINDOW

    // No existing record - create first one
    if (!existing) {
      console.log('[Rate Limit] No existing record, creating new one')
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
        return { allowed: true, remaining: RATE_LIMIT_COUNT - 1 }
      }

      return {
        allowed: true,
        remaining: RATE_LIMIT_COUNT - 1,
        resetAt: now + RATE_LIMIT_WINDOW
      }
    }

    const lastRequestTime = new Date(existing.last_request_at).getTime()
    const timeSinceLastRequest = now - lastRequestTime
    const recordWindowStart = new Date(existing.window_start).getTime()

    console.log('[Rate Limit] Existing record:', {
      count: existing.request_count,
      lastRequest: new Date(lastRequestTime).toISOString(),
      timeSinceLastRequest,
      windowStart: new Date(recordWindowStart).toISOString()
    })

    // CHECK 1: Minimum spacing between requests (3 seconds)
    if (timeSinceLastRequest < MIN_REQUEST_SPACING) {
      const waitTime = Math.ceil((MIN_REQUEST_SPACING - timeSinceLastRequest) / 1000)
      console.log('[Rate Limit] ❌ SPACING LIMIT HIT - wait', waitTime, 'seconds')
      return {
        allowed: false,
        remaining: 0,
        error: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before searching again.`
      }
    }

    // Reset window if it's expired
    if (recordWindowStart < windowStart) {
      console.log('[Rate Limit] Window expired, resetting counter')
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
        return { allowed: true, remaining: RATE_LIMIT_COUNT - 1 }
      }

      return {
        allowed: true,
        remaining: RATE_LIMIT_COUNT - 1,
        resetAt: now + RATE_LIMIT_WINDOW
      }
    }

    // CHECK 2: Total count limit (20 per hour)
    if (existing.request_count >= RATE_LIMIT_COUNT) {
      const resetIn = Math.ceil((recordWindowStart + RATE_LIMIT_WINDOW - now) / 1000 / 60)
      console.log('[Rate Limit] ❌ COUNT LIMIT HIT - reset in', resetIn, 'minutes')
      return {
        allowed: false,
        remaining: 0,
        resetAt: recordWindowStart + RATE_LIMIT_WINDOW,
        error: `Search limit reached. You can search again in ${resetIn} minute${resetIn > 1 ? 's' : ''}.`
      }
    }

    // Increment counter
    const newCount = existing.request_count + 1
    console.log('[Rate Limit] ✅ ALLOWED - incrementing count to', newCount)

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
      remaining: RATE_LIMIT_COUNT - newCount,
      resetAt: recordWindowStart + RATE_LIMIT_WINDOW
    }

  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error)
    // Fail open - allow request if something goes wrong
    return { allowed: true, remaining: RATE_LIMIT_COUNT - 1 }
  }
}

// GET endpoint to check current quota without consuming it
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const supabase = createServerClient()

    const { data: existing } = await supabase
      .from('research_rate_limits')
      .select('*')
      .eq('ip_address', clientIP)
      .single()

    if (!existing) {
      return NextResponse.json({
        used: 0,
        remaining: RATE_LIMIT_COUNT,
        limit: RATE_LIMIT_COUNT,
        resetAt: null
      })
    }

    const now = Date.now()
    const windowStart = new Date(existing.window_start).getTime()
    const windowEnd = windowStart + RATE_LIMIT_WINDOW

    // Check if window has expired
    if (now > windowEnd) {
      return NextResponse.json({
        used: 0,
        remaining: RATE_LIMIT_COUNT,
        limit: RATE_LIMIT_COUNT,
        resetAt: null
      })
    }

    const used = existing.request_count
    const remaining = Math.max(0, RATE_LIMIT_COUNT - used)

    return NextResponse.json({
      used,
      remaining,
      limit: RATE_LIMIT_COUNT,
      resetAt: windowEnd
    })
  } catch (error) {
    console.error('[Research Finder API] Error fetching quota:', error)
    return NextResponse.json({
      used: 0,
      remaining: RATE_LIMIT_COUNT,
      limit: RATE_LIMIT_COUNT,
      resetAt: null
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimit = await checkRateLimit(clientIP)

    console.log('[Research Finder API] Rate limit check result:', {
      ip: clientIP,
      allowed: rateLimit.allowed,
      remaining: rateLimit.remaining
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error || 'Rate limit exceeded.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_COUNT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt?.toString() || '',
          }
        }
      )
    }

    const body = await request.json()
    const { topic } = body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const trimmedTopic = topic.trim()

    if (trimmedTopic.length > 200) {
      return NextResponse.json(
        { error: 'Topic is too long. Maximum 200 characters.' },
        { status: 400 }
      )
    }

    console.log('========================================')
    console.log('[Research Finder API] 🔍 SEARCH REQUEST')
    console.log('[Research Finder API] Topic:', trimmedTopic)
    console.log('[Research Finder API] Topic length:', trimmedTopic.length)
    console.log('[Research Finder API] Topic type:', typeof trimmedTopic)
    console.log('[Research Finder API] Calling searchAcademicPapers (Semantic Scholar + OpenAlex) with limit 10')
    console.log('========================================')

    const papers = await searchAcademicPapers(trimmedTopic, 10)

    console.log('========================================')
    console.log('[Research Finder API] 📊 SEARCH RESULTS FROM ACADEMIC SOURCES')
    console.log('[Research Finder API] Papers returned:', papers.length)
    console.log('[Research Finder API] Papers array:', JSON.stringify(papers, null, 2))
    console.log('========================================')

    const results = papers.map(paper => {
      // Determine source based on URL
      let source = 'Academic Database'
      if (paper.url.includes('semanticscholar.org')) {
        source = 'Semantic Scholar'
      } else if (paper.url.includes('openalex.org')) {
        source = 'OpenAlex'
      }

      return {
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        source,
        hasFreeAccess: paper.hasFreeAccess,
        url: paper.url,
      }
    })

    console.log('========================================')
    console.log('[Research Finder API] 📤 FINAL RESPONSE')
    console.log('[Research Finder API] Results count:', results.length)
    console.log('[Research Finder API] Results:', JSON.stringify(results, null, 2))
    console.log('========================================')

    return NextResponse.json(
      { results },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_COUNT.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt?.toString() || '',
        }
      }
    )
  } catch (error) {
    console.error('[Research Finder API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search. Please try again.' },
      { status: 500 }
    )
  }
}
