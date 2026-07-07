import { NextRequest, NextResponse } from 'next/server'

const CACHE_DURATION = 60 * 60 // 1 hour in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: { base: string } }
) {
  const base = params.base.toUpperCase()

  // Only support GBP as base currency for now
  if (base !== 'GBP') {
    return NextResponse.json(
      { error: 'Only GBP base currency is supported' },
      { status: 400 }
    )
  }

  const endpoints = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.json',
    'https://latest.currency-api.pages.dev/v1/currencies/gbp.json',
  ]

  // Try each endpoint in order
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        // Cache for 1 hour
        next: { revalidate: CACHE_DURATION },
      })

      if (!res.ok) {
        console.error(`Currency API endpoint failed: ${url} - Status: ${res.status}`)
        continue
      }

      const data = await res.json()

      // Validate response structure
      if (!data || !data.gbp || typeof data.gbp !== 'object') {
        console.error(`Currency API returned invalid format from ${url}:`, data)
        continue
      }

      // Success! Return the rates with cache headers
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
        },
      })
    } catch (err) {
      console.error(`Currency API fetch failed for ${url}:`, err)
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  return NextResponse.json(
    { error: 'Failed to fetch exchange rates from all endpoints' },
    { status: 503 }
  )
}
