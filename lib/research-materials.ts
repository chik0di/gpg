export interface ResearchSource {
  title: string
  authors: string
  year: number | null
  url: string
  hasFreeAccess: boolean
  relevanceScore?: number
}

// Rate limiting for Semantic Scholar API (1 request per second)
let lastSemanticScholarRequestTime = 0
const SEMANTIC_SCHOLAR_MIN_DELAY_MS = 1100 // 1.1 seconds to be safe

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

interface OpenAlexWork {
  id: string
  title: string
  authorships?: Array<{ author: { display_name: string } }>
  publication_year?: number
  open_access?: { is_oa: boolean; oa_url?: string }
  abstract_inverted_index?: Record<string, number[]>
}

interface OpenAlexResponse {
  results: OpenAlexWork[]
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
 * Enforce Semantic Scholar rate limit: max 1 request per second
 * This function ensures at least 1100ms has passed since the last request
 */
async function enforceSemanticScholarRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastSemanticScholarRequestTime

  if (timeSinceLastRequest < SEMANTIC_SCHOLAR_MIN_DELAY_MS) {
    const delayNeeded = SEMANTIC_SCHOLAR_MIN_DELAY_MS - timeSinceLastRequest
    console.log(`[Semantic Scholar Rate Limit] ⏳ Waiting ${delayNeeded}ms before next request`)
    await delay(delayNeeded)
  }

  lastSemanticScholarRequestTime = Date.now()
}

/**
 * Reconstruct abstract from OpenAlex inverted index format
 */
function reconstructAbstract(invertedIndex: Record<string, number[]> | undefined): string {
  if (!invertedIndex) return ''

  const words: Array<{ word: string; position: number }> = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    positions.forEach(pos => words.push({ word, position: pos }))
  }

  return words
    .sort((a, b) => a.position - b.position)
    .map(w => w.word)
    .join(' ')
}

/**
 * Search OpenAlex for academic papers
 */
async function searchOpenAlex(query: string, limit: number = 5): Promise<ResearchSource[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.openalex.org/works?search=${encodedQuery}&per_page=${limit * 2}`

    console.log('========================================')
    console.log('[OpenAlex] 🔍 API REQUEST')
    console.log('[OpenAlex] Search query (raw):', query)
    console.log('[OpenAlex] Search query (encoded):', encodedQuery)
    console.log('[OpenAlex] Request limit:', limit * 2)
    console.log('[OpenAlex] Full URL:', url)
    console.log('========================================')

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GetPrimeGrade/1.0 (mailto:support@getprimegrade.com)'
      }
    })

    console.log('========================================')
    console.log('[OpenAlex] 📡 API RESPONSE')
    console.log('[OpenAlex] Status:', response.status)
    console.log('[OpenAlex] Status Text:', response.statusText)
    console.log('[OpenAlex] OK:', response.ok)
    console.log('========================================')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('========================================')
      console.error('[OpenAlex] ❌ API ERROR')
      console.error('[OpenAlex] Status:', response.status)
      console.error('[OpenAlex] Error body:', errorText)
      console.error('========================================')
      return []
    }

    const data: OpenAlexResponse = await response.json()

    console.log('========================================')
    console.log('[OpenAlex] 📊 API DATA')
    console.log('[OpenAlex] Has results array:', !!data.results)
    console.log('[OpenAlex] Results array length:', data.results?.length ?? 0)
    if (data.results && data.results.length > 0) {
      console.log('[OpenAlex] First result sample:', {
        title: data.results[0].title,
        authors: data.results[0].authorships?.map(a => a.author.display_name).join(', '),
        year: data.results[0].publication_year,
        id: data.results[0].id,
      })
    }
    console.log('========================================')

    if (!data.results || data.results.length === 0) {
      console.log('[OpenAlex] ⚠️ No results returned from API')
      return []
    }

    // Transform and score results
    console.log('[OpenAlex] 🎯 TRANSFORMING RESULTS')
    const transformedResults = data.results
      .map(work => {
        const firstAuthor = work.authorships?.[0]?.author.display_name || 'Unknown Author'
        const authorCount = work.authorships?.length || 0
        const authors = authorCount > 1 ? `${firstAuthor} et al.` : firstAuthor

        // Prefer open access URL, otherwise use OpenAlex work page
        const hasFreeAccess = work.open_access?.is_oa || false
        const url = hasFreeAccess && work.open_access?.oa_url
          ? work.open_access.oa_url
          : work.id

        // Reconstruct abstract for relevance scoring
        const abstract = reconstructAbstract(work.abstract_inverted_index)

        // Create a temporary paper object for scoring
        const paperForScoring = {
          title: work.title,
          abstract
        }

        const relevanceScore = calculateRelevanceScore(paperForScoring as any, query)

        console.log(`[OpenAlex] Paper: "${work.title.substring(0, 50)}..." | Relevance: ${relevanceScore}`)

        return {
          title: work.title,
          authors,
          year: work.publication_year || null,
          url,
          hasFreeAccess,
          relevanceScore
        }
      })
      .filter(result => {
        const keep = result.relevanceScore > 0
        if (!keep) {
          console.log(`[OpenAlex] ❌ Filtered out (relevance=0): "${result.title.substring(0, 50)}..."`)
        }
        return keep
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit)

    console.log('========================================')
    console.log('[OpenAlex] ✅ FINAL RESULTS')
    console.log(`[OpenAlex] Found ${transformedResults.length} relevant results for "${query}"`)
    console.log('[OpenAlex] Top results:', transformedResults.map(r => ({
      title: r.title.substring(0, 60),
      relevance: r.relevanceScore,
      freeAccess: r.hasFreeAccess,
    })))
    console.log('========================================')

    return transformedResults
  } catch (error) {
    console.error('[OpenAlex] Search failed:', error)
    return []
  }
}

/**
 * Search Semantic Scholar for academic papers with relevance filtering
 * Rate limited to 1 request per second
 */
async function searchSemanticScholar(query: string, limit: number = 5): Promise<ResearchSource[]> {
  try {
    // Enforce rate limit before making the request
    await enforceSemanticScholarRateLimit()

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

    // Get API key from environment
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }

    if (apiKey) {
      headers['x-api-key'] = apiKey
      console.log('[Semantic Scholar] ✅ Using API key for authentication')
    } else {
      console.log('[Semantic Scholar] ⚠️ WARNING: No API key found - requests will likely be rate limited')
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
    console.error('[Semantic Scholar] Search failed:', error)
    return []
  }
}

/**
 * Search both Semantic Scholar and OpenAlex, merge and deduplicate results
 * Note: Semantic Scholar is rate-limited to 1 req/sec, so calls are sequential
 * OpenAlex has no rate limit and runs in parallel with Semantic Scholar
 */
export async function searchAcademicPapers(query: string, limit: number = 10): Promise<ResearchSource[]> {
  console.log('========================================')
  console.log('[searchAcademicPapers] 🚀 STARTING DUAL-SOURCE SEARCH')
  console.log('[searchAcademicPapers] Query:', query)
  console.log('[searchAcademicPapers] Limit:', limit)
  console.log('========================================')

  // Start both searches in parallel (Semantic Scholar enforces its own rate limit internally)
  const [scholarResults, openAlexResults] = await Promise.all([
    searchSemanticScholar(query, limit).catch(err => {
      console.error('[searchAcademicPapers] Semantic Scholar error (continuing with OpenAlex):', err)
      return []
    }),
    searchOpenAlex(query, limit).catch(err => {
      console.error('[searchAcademicPapers] OpenAlex error (continuing with Semantic Scholar):', err)
      return []
    })
  ])

  console.log('========================================')
  console.log('[searchAcademicPapers] 📊 DUAL-SOURCE SEARCH RESULTS')
  console.log('[searchAcademicPapers] Semantic Scholar results:', scholarResults.length)
  console.log('[searchAcademicPapers] OpenAlex results:', openAlexResults.length)
  console.log('========================================')

  // Merge results
  const allResults = [...scholarResults, ...openAlexResults]

  // Deduplicate by normalized title
  const seen = new Set<string>()
  const uniqueResults: ResearchSource[] = []

  for (const result of allResults) {
    const normalizedTitle = result.title.toLowerCase().trim().replace(/[^\w\s]/g, '')

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle)
      uniqueResults.push(result)
    } else {
      console.log(`[searchAcademicPapers] 🔄 Duplicate removed: "${result.title.substring(0, 50)}..."`)
    }
  }

  // Sort by relevance score and take top results
  const finalResults = uniqueResults
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, limit)

  console.log('========================================')
  console.log('[searchAcademicPapers] ✅ FINAL MERGED RESULTS')
  console.log('[searchAcademicPapers] Total before dedup:', allResults.length)
  console.log('[searchAcademicPapers] Unique results:', uniqueResults.length)
  console.log('[searchAcademicPapers] Final results:', finalResults.length)
  console.log('[searchAcademicPapers] Results:', finalResults.map(r => ({
    title: r.title.substring(0, 60),
    relevance: r.relevanceScore,
    source: r.url.includes('semanticscholar') ? 'Semantic Scholar' : (r.url.includes('openalex') ? 'OpenAlex' : 'Other'),
  })))
  console.log('========================================')

  return finalResults
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
 * Uses both Semantic Scholar (rate-limited, sequential) and OpenAlex APIs
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

      // searchAcademicPapers handles rate limiting internally for Semantic Scholar
      // No additional delay needed here - the rate limiter will enforce spacing
      const results = await searchAcademicPapers(term, 5)
      allSources.push(...results)

      console.log(`[fetchResearchMaterials] ✅ Added ${results.length} results for "${term}"`)
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
