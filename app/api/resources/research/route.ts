import { NextRequest, NextResponse } from 'next/server'
import { searchAcademicPapers } from '@/lib/research-materials'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request)
    const { allowed, remaining } = checkRateLimit(rateLimitKey)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in an hour.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
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
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
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
