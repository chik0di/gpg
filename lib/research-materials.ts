export interface ResearchSource {
  title: string
  authors: string
  year: number | null
  url: string
  hasFreeAccess: boolean
  relevanceScore?: number
}

interface SemanticScholarPaper {
  paperId: string
  title: string
  authors?: Array<{ name: string }>
  year?: number
  externalIds?: { DOI?: string }
  openAccessPdf?: { url: string } | null
  abstract?: string
}

interface SemanticScholarResponse {
  data: SemanticScholarPaper[]
}

/**
 * Calculate relevance score for a paper based on search query
 * Returns 0-100 score based on keyword matches in title
 */
function calculateRelevanceScore(paper: SemanticScholarPaper, searchQuery: string): number {
  const title = paper.title.toLowerCase()
  const abstract = (paper.abstract || '').toLowerCase()

  // Extract key terms from search query (split on spaces, filter short words)
  const searchTerms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 3) // Ignore short words like "the", "and", etc.

  if (searchTerms.length === 0) return 50 // No valid search terms

  let score = 0
  let titleMatches = 0
  let abstractMatches = 0

  for (const term of searchTerms) {
    if (title.includes(term)) {
      titleMatches++
      score += 30 // Title match is worth more
    } else if (abstract.includes(term)) {
      abstractMatches++
      score += 10 // Abstract match is worth less
    }
  }

  // Require at least one title match for relevance
  if (titleMatches === 0) return 0

  // Normalize score (cap at 100)
  return Math.min(100, score)
}

/**
 * Helper to add delay between requests to avoid rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Search Semantic Scholar for academic papers with relevance filtering
 */
export async function searchSemanticScholar(query: string, limit: number = 5): Promise<ResearchSource[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    // Request more results to account for filtering
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=${limit * 3}&fields=title,authors,year,externalIds,openAccessPdf,abstract`

    console.log('========================================')
    console.log('[Semantic Scholar] 🔍 API REQUEST')
    console.log('[Semantic Scholar] Search query (raw):', query)
    console.log('[Semantic Scholar] Search query (encoded):', encodedQuery)
    console.log('[Semantic Scholar] Request limit:', limit * 3)
    console.log('[Semantic Scholar] Full URL:', url)
    console.log('========================================')

    // Check for API key in environment
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }

    if (apiKey) {
      headers['x-api-key'] = apiKey
      console.log('[Semantic Scholar] ✅ Using API key for authentication')
    } else {
      console.log('[Semantic Scholar] ⚠️ No API key found - using unauthenticated requests (subject to rate limits)')
    }

    const response = await fetch(url, { headers })

    console.log('========================================')
    console.log('[Semantic Scholar] 📡 API RESPONSE')
    console.log('[Semantic Scholar] Status:', response.status)
    console.log('[Semantic Scholar] Status Text:', response.statusText)
    console.log('[Semantic Scholar] OK:', response.ok)
    console.log('[Semantic Scholar] Headers:', Object.fromEntries(response.headers.entries()))
    console.log('========================================')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('========================================')
      console.error('[Semantic Scholar] ❌ API ERROR')
      console.error('[Semantic Scholar] Status:', response.status)
      console.error('[Semantic Scholar] Error body:', errorText)
      console.error('========================================')
      return []
    }

    const data: SemanticScholarResponse = await response.json()

    console.log('========================================')
    console.log('[Semantic Scholar] 📊 API DATA')
    console.log('[Semantic Scholar] Has data array:', !!data.data)
    console.log('[Semantic Scholar] Data array length:', data.data?.length ?? 0)
    if (data.data && data.data.length > 0) {
      console.log('[Semantic Scholar] First result sample:', {
        title: data.data[0].title,
        authors: data.data[0].authors?.map(a => a.name).join(', '),
        year: data.data[0].year,
        paperId: data.data[0].paperId,
      })
    }
    console.log('[Semantic Scholar] Full response:', JSON.stringify(data, null, 2))
    console.log('========================================')

    if (!data.data || data.data.length === 0) {
      console.log('[Semantic Scholar] ⚠️ No results returned from API')
      return []
    }

    // Score and filter results
    console.log('[Semantic Scholar] 🎯 SCORING RESULTS')
    const scoredResults = data.data
      .map(paper => {
        const firstAuthor = paper.authors?.[0]?.name || 'Unknown Author'
        const authorCount = paper.authors?.length || 0
        const authors = authorCount > 1 ? `${firstAuthor} et al.` : firstAuthor

        // Determine URL - prefer free PDF, otherwise use Semantic Scholar page
        const hasFreeAccess = !!paper.openAccessPdf?.url
        const url = hasFreeAccess
          ? paper.openAccessPdf!.url
          : `https://www.semanticscholar.org/paper/${paper.paperId}`

        // Calculate relevance score
        const relevanceScore = calculateRelevanceScore(paper, query)

        console.log(`[Semantic Scholar] Paper: "${paper.title.substring(0, 50)}..." | Relevance: ${relevanceScore}`)

        return {
          title: paper.title,
          authors,
          year: paper.year || null,
          url,
          hasFreeAccess,
          relevanceScore
        }
      })
      .filter(result => {
        const keep = result.relevanceScore > 0
        if (!keep) {
          console.log(`[Semantic Scholar] ❌ Filtered out (relevance=0): "${result.title.substring(0, 50)}..."`)
        }
        return keep
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)) // Sort by relevance
      .slice(0, limit) // Take top N results

    console.log('========================================')
    console.log('[Semantic Scholar] ✅ FINAL RESULTS')
    console.log(`[Semantic Scholar] Found ${scoredResults.length} relevant results for "${query}"`)
    console.log(`[Semantic Scholar] (filtered from ${data.data.length} total API results)`)
    console.log('[Semantic Scholar] Top results:', scoredResults.map(r => ({
      title: r.title.substring(0, 60),
      relevance: r.relevanceScore,
      freeAccess: r.hasFreeAccess,
    })))
    console.log('========================================')
    return scoredResults
  } catch (error) {
    console.error('[research-materials] Semantic Scholar search failed:', error)
    return []
  }
}

// Web search fallback removed to control API costs

/**
 * Deduplicate sources by title similarity
 */
function deduplicateSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>()
  const unique: ResearchSource[] = []

  for (const source of sources) {
    // Normalize title for comparison (lowercase, remove punctuation)
    const normalizedTitle = source.title.toLowerCase().replace(/[^\w\s]/g, '')

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle)
      unique.push(source)
    }
  }

  return unique
}

/**
 * Fetch research materials for multiple deliverables
 * Returns top 10-15 unique sources across all deliverables
 * Only uses Semantic Scholar API (no Claude web search fallback)
 */
export async function fetchResearchMaterials(
  searchTerms: string[][],
  anthropicApiKey: string // Kept for backwards compatibility but unused
): Promise<ResearchSource[]> {
  console.log('========================================')
  console.log('[fetchResearchMaterials] 🚀 STARTING RESEARCH MATERIALS FETCH')
  console.log('[fetchResearchMaterials] Total deliverables:', searchTerms.length)
  console.log('[fetchResearchMaterials] Search terms by deliverable:', searchTerms)
  console.log('========================================')

  const allSources: ResearchSource[] = []

  for (let i = 0; i < searchTerms.length; i++) {
    const terms = searchTerms[i]
    console.log(`[fetchResearchMaterials] 📚 Processing deliverable ${i + 1}/${searchTerms.length}`)
    console.log(`[fetchResearchMaterials] Terms for this deliverable:`, terms)

    for (let j = 0; j < terms.length; j++) {
      const term = terms[j]
      console.log(`[fetchResearchMaterials] 🔎 Searching term ${j + 1}/${terms.length}: "${term}"`)

      // Add delay between requests to avoid rate limiting (1 second per request)
      if (i > 0 || j > 0) {
        console.log('[fetchResearchMaterials] ⏳ Waiting 1 second to avoid rate limits...')
        await delay(1000)
      }

      // Use Semantic Scholar only (no fallback)
      const scholarResults = await searchSemanticScholar(term, 5)
      allSources.push(...scholarResults)

      console.log(`[fetchResearchMaterials] ✅ Added ${scholarResults.length} results for "${term}"`)
      console.log(`[fetchResearchMaterials] Total sources so far: ${allSources.length}`)
    }
  }

  console.log('========================================')
  console.log('[fetchResearchMaterials] 🔄 DEDUPLICATING SOURCES')
  console.log('[fetchResearchMaterials] Total sources before dedup:', allSources.length)
  console.log('========================================')

  // Deduplicate and limit to top 15
  const uniqueSources = deduplicateSources(allSources)

  console.log('========================================')
  console.log('[fetchResearchMaterials] ✅ FINAL RESULTS')
  console.log('[fetchResearchMaterials] Unique sources after dedup:', uniqueSources.length)
  console.log('[fetchResearchMaterials] Returning top 15 sources (or fewer if less available)')
  console.log('[fetchResearchMaterials] Sources:', uniqueSources.slice(0, 15).map((s, i) => ({
    index: i + 1,
    title: s.title.substring(0, 60),
    year: s.year,
    freeAccess: s.hasFreeAccess,
    relevance: s.relevanceScore,
  })))
  console.log('========================================')

  return uniqueSources.slice(0, 15)
}
