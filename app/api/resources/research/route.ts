import { NextRequest, NextResponse } from 'next/server'
import { searchAcademicPapersDetailed } from '@/lib/research-materials'
import { createServerClient } from '@/lib/supabase/server'

import { checkRateLimit, getClientIP, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW } from '@/lib/resource-rate-limit'

export const maxDuration = 60

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
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  const { fromYear, toYear, freeOnly } = body || {}
  const validYear = (year: unknown) => year === undefined || (typeof year === 'number' && Number.isInteger(year) && year >= 1500 && year <= new Date().getFullYear() + 1)
  if (!topic || topic.length > 200 || !validYear(fromYear) || !validYear(toYear) || (fromYear && toYear && fromYear > toYear) || (freeOnly !== undefined && typeof freeOnly !== 'boolean')) {
    return NextResponse.json({ error: 'Enter a topic (up to 200 characters) and a valid publication year range.' }, { status: 400 })
  }
  const rateLimit = await checkRateLimit(getClientIP(request))
  const headers = {
    'X-RateLimit-Limit': String(RATE_LIMIT_COUNT),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetAt || ''),
  }
  if (!rateLimit.allowed) return NextResponse.json({ error: rateLimit.error }, { status: 429, headers })
  try {
    const { sources, warnings } = await searchAcademicPapersDetailed(topic, 15, { fromYear, toYear, freeOnly })
    return NextResponse.json({ results: sources, warnings }, { headers })
  } catch {
    return NextResponse.json({ error: 'The academic databases are temporarily unavailable. Please try again shortly.' }, { status: 503, headers })
  }
}
