import { parseDocument, DomUtils } from 'htmlparser2'

export interface ReferenceMetadata {
  type: 'book' | 'journal' | 'website'
  title: string
  authors: string[]
  year: string
  edition?: string
  isbn?: string
  publicationDate?: string
  siteName?: string
  articleNumber?: string
  publisher?: string
  place?: string
  journalName?: string
  volume?: string
  issue?: string
  pageRange?: string
  doi?: string
  organisation?: string
  url?: string
}

export function plainText(value: string | undefined): string {
  return value ? DomUtils.textContent(parseDocument(value)).replace(/\s+/g, ' ').trim() : ''
}

export function normalizeDoi(value: string): string | null {
  let input = value.trim().replace(/^doi:\s*/i, '')
  try {
    if (/^https?:\/\//i.test(input)) {
      const url = new URL(input)
      if (!['doi.org', 'dx.doi.org'].includes(url.hostname.toLowerCase())) return null
      input = decodeURIComponent(url.pathname.slice(1))
    }
  } catch { return null }
  return /^10\.\d{4,9}\/\S+$/i.test(input) && input.length <= 250 ? input.toLowerCase() : null
}

export function normalizeIsbn(value: string): string | null {
  const isbn = value.replace(/^ISBN(?:-1[03])?:?\s*/i, '').replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((n, c, i) => n + (c === 'X' ? 10 : Number(c)) * (10 - i), 0)
    return sum % 11 === 0 ? isbn : null
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    return [...isbn].reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0 ? isbn : null
  }
  return null
}

export function safeLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

export interface CrossrefWork {
  DOI?: string
  title?: string[]
  author?: { given?: string; family?: string; name?: string }[]
  type?: string
  publisher?: string
  'edition-number'?: string
  'publisher-location'?: string
  'container-title'?: string[]
  published?: { 'date-parts'?: number[][] }
  issued?: { 'date-parts'?: number[][] }
  volume?: string
  issue?: string
  page?: string
  'article-number'?: string
  abstract?: string
  URL?: string
}

export function crossrefMetadata(work: CrossrefWork): ReferenceMetadata {
  return {
    type: work.type === 'book' || work.type === 'monograph' || work.type === 'edited-book' ? 'book' : 'journal',
    title: plainText(work.title?.[0]),
    authors: (work.author || []).map(a => a.family ? [a.family, a.given].filter(Boolean).join(', ') : a.name || '').filter(Boolean),
    year: String(work.published?.['date-parts']?.[0]?.[0] || work.issued?.['date-parts']?.[0]?.[0] || ''),
    publisher: work.publisher,
    place: work['publisher-location'],
    journalName: plainText(work['container-title']?.[0]),
    volume: work.volume,
    issue: work.issue,
    pageRange: work.page,
    articleNumber: work['article-number'],
    edition: work['edition-number'],
    doi: work.DOI,
    url: work.DOI ? `https://doi.org/${work.DOI}` : safeLink(work.URL),
  }
}

export async function academicJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'GetPrimeGrade/1.0 (support@getprimegrade.com)', ...headers },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(response.status === 404 ? 'Source not found. Check the identifier or enter the details manually.' : 'The source database is temporarily unavailable. Please try again.')
  return response.json()
}

export async function lookupDoi(doi: string): Promise<ReferenceMetadata> {
  const data = await academicJson<{ message: CrossrefWork }>(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
  const metadata = crossrefMetadata(data.message)
  if (!metadata.title) throw new Error('No citation details were found for this DOI.')
  return metadata
}
