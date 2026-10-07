import { academicJson, crossrefMetadata, plainText, safeLink, type CrossrefWork } from './academic-metadata'

export interface ResearchSource {
  title: string
  authors: string
  year: number | null
  url: string
  hasFreeAccess: boolean
  relevanceScore?: number
  source?: string
  abstract?: string
  journal?: string
  doi?: string
  pdfUrl?: string
  freeUrl?: string
}
export interface ResearchFilters { fromYear?: number; toYear?: number; freeOnly?: boolean }

let nextScholarSlot = 0
async function scholarSlot() {
  const slot = Math.max(Date.now(), nextScholarSlot)
  nextScholarSlot = slot + 1100
  if (slot > Date.now()) await new Promise(resolve => setTimeout(resolve, slot - Date.now()))
}

function authors(names: string[]) { return names.length > 3 ? `${names.slice(0, 3).join('; ')} et al.` : names.join('; ') || 'Authors unavailable' }
function abstractFromIndex(index?: Record<string, number[]>) {
  const words: string[] = []
  for (const [word, positions] of Object.entries(index || {})) for (const position of positions) if (position < 5000) words[position] = word
  return words.join(' ')
}
function pdfLink(value: unknown) {
  const link = safeLink(value)
  return link && (/\.pdf(?:$|[?#])/i.test(link) || /arxiv\.org\/pdf\//i.test(link)) ? link : undefined
}
function relevance(source: ResearchSource, query: string) {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(t => !['the', 'and', 'of', 'in', 'a', 'to', 'for', 'on'].includes(t))
  if (!terms.length) return 0
  const title = source.title.toLowerCase(), abstract = (source.abstract || '').toLowerCase()
  return terms.reduce((score, term) => score + (title.includes(term) ? 2 : abstract.includes(term) ? 1 : 0), 0) / (terms.length * 2) + (title.includes(query.toLowerCase()) ? 0.25 : 0)
}

async function scholar(query: string, count: number): Promise<ResearchSource[]> {
  await scholarSlot()
  const data = await academicJson<{ data: { paperId: string; title: string; authors?: { name: string }[]; year?: number; externalIds?: { DOI?: string }; openAccessPdf?: { url?: string }; abstract?: string; journal?: { name?: string }; url?: string }[] }>(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${count}&fields=title,authors,year,externalIds,openAccessPdf,abstract,journal,url`,
    process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY } : {},
  )
  if (!Array.isArray(data.data)) throw new Error('Invalid Semantic Scholar response')
  return data.data.filter(p => p.title).map(p => {
    const freeUrl = safeLink(p.openAccessPdf?.url), pdfUrl = pdfLink(freeUrl)
    return { title: p.title, authors: authors((p.authors || []).map(a => a.name)), year: p.year || null, url: safeLink(p.url) || `https://www.semanticscholar.org/paper/${p.paperId}`, source: 'Semantic Scholar', hasFreeAccess: !!freeUrl, freeUrl, pdfUrl, abstract: p.abstract || undefined, journal: p.journal?.name, doi: p.externalIds?.DOI }
  })
}
async function openAlex(query: string, count: number, filters: ResearchFilters): Promise<ResearchSource[]> {
  type Location = { pdf_url?: string; landing_page_url?: string; is_oa?: boolean; source?: { display_name?: string } }
  const url = new URL('https://api.openalex.org/works')
  url.searchParams.set('search', query)
  url.searchParams.set('per_page', String(count))
  const range = `${filters.fromYear || 1500}-${filters.toYear || new Date().getFullYear() + 1}`
  const filter = [...(filters.fromYear || filters.toYear ? [`publication_year:${range}`] : []), ...(filters.freeOnly ? ['is_oa:true'] : [])]
  if (filter.length) url.searchParams.set('filter', filter.join(','))
  if (process.env.OPENALEX_API_KEY) url.searchParams.set('api_key', process.env.OPENALEX_API_KEY)
  const data = await academicJson<{ results: { id: string; title: string; authorships?: { author: { display_name: string } }[]; publication_year?: number; doi?: string; primary_location?: Location; best_oa_location?: Location; open_access?: { is_oa: boolean; oa_url?: string }; abstract_inverted_index?: Record<string, number[]> }[] }>(url.href)
  if (!Array.isArray(data.results)) throw new Error('Invalid OpenAlex response')
  return data.results.filter(p => p.title).map(p => {
    const location = p.best_oa_location
    const freeUrl = safeLink(location?.pdf_url) || safeLink(location?.landing_page_url) || (p.open_access?.is_oa ? safeLink(p.open_access.oa_url) : undefined)
    const pdfUrl = safeLink(location?.pdf_url) || pdfLink(freeUrl)
    return { title: p.title, authors: authors((p.authorships || []).map(a => a.author.display_name)), year: p.publication_year || null, url: safeLink(p.doi) || safeLink(p.primary_location?.landing_page_url) || p.id, source: 'OpenAlex', hasFreeAccess: !!freeUrl, pdfUrl, freeUrl, abstract: abstractFromIndex(p.abstract_inverted_index) || undefined, journal: p.primary_location?.source?.display_name, doi: p.doi?.replace(/^https?:\/\/doi.org\//, '') }
  })
}
async function crossref(query: string, count: number, filters: ResearchFilters): Promise<ResearchSource[]> {
  const filter = ['type:journal-article', ...(filters.fromYear ? [`from-pub-date:${filters.fromYear}-01-01`] : []), ...(filters.toYear ? [`until-pub-date:${filters.toYear}-12-31`] : [])]
  const data = await academicJson<{ message: { items: CrossrefWork[] } }>(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${count}&filter=${encodeURIComponent(filter.join(','))}`)
  if (!Array.isArray(data.message?.items)) throw new Error('Invalid Crossref response')
  return data.message.items.filter(w => w.title?.[0]).map(w => {
    const m = crossrefMetadata(w)
    return { title: m.title, authors: authors(m.authors), year: Number(m.year) || null, url: m.url || 'https://search.crossref.org', source: 'Crossref', hasFreeAccess: false, doi: m.doi, journal: m.journalName, abstract: plainText(w.abstract) || undefined }
  })
}

export function mergeResearchSources(sources: ResearchSource[], query: string, limit: number, filters: ResearchFilters = {}) {
  const merged: ResearchSource[] = []
  for (const source of sources) {
    const titleKey = source.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    const duplicate = merged.find(s => (s.doi && source.doi && s.doi.toLowerCase() === source.doi.toLowerCase()) || (s.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === titleKey && (!s.year || !source.year || s.year === source.year)))
    if (!duplicate) merged.push({ ...source })
    else {
      duplicate.source = [...new Set([...(duplicate.source || '').split(' · '), source.source || 'Academic database'])].filter(Boolean).join(' · ')
      for (const key of ['doi', 'journal', 'pdfUrl', 'freeUrl'] as const) duplicate[key] ||= source[key]
      if ((source.abstract?.length || 0) > (duplicate.abstract?.length || 0)) duplicate.abstract = source.abstract
      if (duplicate.authors === 'Authors unavailable') duplicate.authors = source.authors
      duplicate.year ||= source.year
      duplicate.hasFreeAccess = !!(duplicate.pdfUrl || duplicate.freeUrl)
    }
  }
  return merged.filter(s => (!filters.freeOnly || s.hasFreeAccess) && (!filters.fromYear || (s.year !== null && s.year >= filters.fromYear)) && (!filters.toYear || (s.year !== null && s.year <= filters.toYear)))
    .map(s => ({ ...s, relevanceScore: relevance(s, query) }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, limit)
}
export async function searchAcademicPapersDetailed(query: string, limit = 15, filters: ResearchFilters = {}) {
  const count = Math.min(60, Math.max(20, limit * 3))
  const names = ['Semantic Scholar', 'OpenAlex', 'Crossref']
  const results = await Promise.allSettled([scholar(query, count), openAlex(query, count, filters), crossref(query, count, filters)])
  if (results.every(r => r.status === 'rejected')) throw new Error('The academic databases are temporarily unavailable. Please try again shortly.')
  return {
    sources: mergeResearchSources(results.flatMap(r => r.status === 'fulfilled' ? r.value : []), query, limit, filters),
    warnings: results.flatMap((r, i) => r.status === 'rejected' ? [`${names[i]} is temporarily unavailable. Results from the other databases are shown.`] : []),
  }
}
export async function searchAcademicPapers(query: string, limit = 10): Promise<ResearchSource[]> {
  return (await searchAcademicPapersDetailed(query, limit)).sources
}
export async function fetchResearchMaterials(searchTerms: string[][], _anthropicApiKey: string): Promise<ResearchSource[]> {
  const sources: ResearchSource[] = []
  for (const terms of searchTerms) for (const term of terms) sources.push(...await searchAcademicPapers(term, 5))
  // Preserve the free-access URL used by the assignment research endpoint.
  return mergeResearchSources(sources, searchTerms.flat().join(' '), 15).map(source => ({ ...source, url: source.pdfUrl || source.freeUrl || source.url }))
}
