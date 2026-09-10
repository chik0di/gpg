import Anthropic from '@anthropic-ai/sdk'

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
 * Search Semantic Scholar for academic papers with relevance filtering
 */
async function searchSemanticScholar(query: string, limit: number = 5): Promise<ResearchSource[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    // Request more results to account for filtering
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=${limit * 3}&fields=title,authors,year,externalIds,openAccessPdf,abstract`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.warn(`[research-materials] Semantic Scholar API error: ${response.status}`)
      return []
    }

    const data: SemanticScholarResponse = await response.json()

    if (!data.data || data.data.length === 0) {
      return []
    }

    // Score and filter results
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

        return {
          title: paper.title,
          authors,
          year: paper.year || null,
          url,
          hasFreeAccess,
          relevanceScore
        }
      })
      .filter(result => result.relevanceScore > 0) // Filter out irrelevant results
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)) // Sort by relevance
      .slice(0, limit) // Take top N results

    console.log(`[research-materials] Found ${scoredResults.length} relevant results for "${query}" (from ${data.data.length} total)`)
    return scoredResults
  } catch (error) {
    console.error('[research-materials] Semantic Scholar search failed:', error)
    return []
  }
}

/**
 * Use Claude with web search to find academic sources as fallback
 */
async function searchWithClaude(topic: string, anthropicApiKey: string): Promise<ResearchSource[]> {
  try {
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search'
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Find 3-5 relevant academic sources (research papers, journal articles, or scholarly publications) about: ${topic}

For each source, provide:
- Title
- First author (or "Author Name et al." if multiple authors)
- Publication year
- Direct URL to the source

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Paper title here",
    "authors": "Smith et al.",
    "year": 2023,
    "url": "https://..."
  }
]

No other text, just the JSON array.`
        }
      ]
    })

    // Extract text content from Claude's response
    const textContent = message.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.warn('[research-materials] No text content in Claude response')
      return []
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.warn('[research-materials] No JSON array found in Claude response')
      return []
    }

    const sources = JSON.parse(jsonMatch[0])

    // Convert to ResearchSource format
    return sources.map((source: any) => ({
      title: source.title || 'Untitled',
      authors: source.authors || 'Unknown',
      year: source.year || null,
      url: source.url || '',
      hasFreeAccess: false // Cannot confirm free access from Claude results
    }))
  } catch (error) {
    console.error('[research-materials] Claude search failed:', error)
    return []
  }
}

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
 */
export async function fetchResearchMaterials(
  searchTerms: string[][],
  anthropicApiKey: string
): Promise<ResearchSource[]> {
  const allSources: ResearchSource[] = []

  for (const terms of searchTerms) {
    for (const term of terms) {
      console.log(`[research-materials] Searching for: ${term}`)

      // Try Semantic Scholar first
      const scholarResults = await searchSemanticScholar(term, 5)
      allSources.push(...scholarResults)

      // If we got fewer than 3 results, use Claude fallback
      if (scholarResults.length < 3) {
        console.log(`[research-materials] Only ${scholarResults.length} results from Semantic Scholar, trying Claude fallback`)
        const claudeResults = await searchWithClaude(term, anthropicApiKey)
        allSources.push(...claudeResults)
      }
    }
  }

  // Deduplicate and limit to top 15
  const uniqueSources = deduplicateSources(allSources)
  return uniqueSources.slice(0, 15)
}
