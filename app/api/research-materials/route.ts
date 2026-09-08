import { NextRequest, NextResponse } from 'next/server'
import { fetchResearchMaterials } from '@/lib/research-materials'

export async function POST(request: NextRequest) {
  try {
    const { searchTerms } = await request.json()

    if (!searchTerms || !Array.isArray(searchTerms)) {
      return NextResponse.json(
        { error: 'Invalid search terms' },
        { status: 400 }
      )
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      console.error('[research-materials] ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ sources: [] })
    }

    console.log('[research-materials] Fetching materials for search terms:', searchTerms)
    const sources = await fetchResearchMaterials(searchTerms, anthropicApiKey)

    console.log('[research-materials] Found', sources.length, 'sources')
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('[research-materials] Error:', error)
    // Return empty array on error - don't expose error to client
    return NextResponse.json({ sources: [] })
  }
}
