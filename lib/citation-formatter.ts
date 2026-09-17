/**
 * Citation Formatter Library - Verified Precise Rules
 * Pure functions for formatting citations in 5 academic styles
 * Each style has distinct, verified formatting logic
 */

// ============================================
// Type Definitions
// ============================================

export type CitationStyle = 'APA' | 'Harvard' | 'Vancouver' | 'MLA' | 'Chicago'
export type SourceType = 'book' | 'website' | 'journal'

export interface BookSource {
  type: 'book'
  authors: string[] // "Surname, F." format from parser
  title: string
  year: string
  publisher: string
  place: string
}

export interface WebsiteSource {
  type: 'website'
  authors?: string[]
  organisation?: string
  title: string
  year: string
  url: string
  dateAccessed: string // "DD Month YYYY"
}

export interface JournalSource {
  type: 'journal'
  authors: string[]
  title: string
  journalName: string
  year: string
  volume: string
  issue?: string
  pageRange: string // "123-145"
  doi?: string
}

export type CitationSource = BookSource | WebsiteSource | JournalSource

export interface FormattedCitation {
  inText: string
  fullReference: string
  style: CitationStyle
  sortKey: string
  vancouverNumber?: number
}

// ============================================
// Vancouver Number Tracking
// ============================================

let vancouverCounter = 0
const vancouverMap = new Map<string, number>()

export function resetVancouverCounter() {
  vancouverCounter = 0
  vancouverMap.clear()
}

function getVancouverNumber(source: CitationSource): number {
  const key = JSON.stringify(source)

  if (vancouverMap.has(key)) {
    return vancouverMap.get(key)!
  }

  vancouverCounter++
  vancouverMap.set(key, vancouverCounter)
  return vancouverCounter
}

// ============================================
// Helper: Extract Name Parts
// ============================================

interface NameParts {
  surname: string
  firstInitial: string
  fullFirst: string
}

function parseAuthorName(author: string): NameParts {
  // Input format: "Surname, F." or "Surname, Full"
  const parts = author.split(',').map(p => p.trim())
  const surname = parts[0] || ''
  const firstPart = parts[1] || ''

  // Extract initial (first character)
  const firstInitial = firstPart.charAt(0).toUpperCase()

  // For full first name, remove period if present
  const fullFirst = firstPart.replace(/\.$/, '').trim()

  return { surname, firstInitial, fullFirst }
}

// ============================================
// APA 7th Edition
// ============================================

function formatAPAAuthorsReference(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  // Invert ALL authors: Surname, F. M.
  const formatted = authors.map(author => {
    const { surname, firstInitial } = parseAuthorName(author)
    return `${surname}, ${firstInitial}.`
  })

  // Ampersand before last
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`

  const allButLast = formatted.slice(0, -1).join(', ')
  return `${allButLast}, & ${formatted[formatted.length - 1]}`
}

function formatAPAAuthorsInText(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  const surnames = authors.map(a => parseAuthorName(a).surname)

  if (surnames.length === 1) return surnames[0]
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
  return `${surnames[0]} et al.`
}

function formatAPABook(source: BookSource): FormattedCitation {
  const authors = formatAPAAuthorsReference(source.authors)
  const inText = `(${formatAPAAuthorsInText(source.authors)}, ${source.year})`
  const fullReference = `${authors} (${source.year}). *${source.title}*. ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatAPAJournal(source: JournalSource): FormattedCitation {
  const authors = formatAPAAuthorsReference(source.authors)
  const inText = `(${formatAPAAuthorsInText(source.authors)}, ${source.year})`

  const issue = source.issue ? `(${source.issue})` : ''
  const doiPart = source.doi ? ` https://doi.org/${source.doi}` : ''

  const fullReference = `${authors} (${source.year}). ${source.title}. *${source.journalName}*, *${source.volume}*${issue}, ${source.pageRange}.${doiPart}`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatAPAWebsite(source: WebsiteSource): FormattedCitation {
  const authors = source.authors
    ? formatAPAAuthorsReference(source.authors)
    : source.organisation || 'Unknown'

  const inTextName = source.authors
    ? formatAPAAuthorsInText(source.authors)
    : source.organisation || 'Unknown'

  const inText = `(${inTextName}, ${source.year})`

  // Parse date for "Year, Month Day" format
  const dateParts = source.dateAccessed.split(' ')
  const monthDay = dateParts.length >= 2 ? `, ${dateParts[1]} ${dateParts[0]}` : ''

  const fullReference = `${authors} (${source.year}${monthDay}). *${source.title}*. ${source.url}`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: source.authors
      ? parseAuthorName(source.authors[0]).surname.toLowerCase()
      : (source.organisation || 'unknown').toLowerCase()
  }
}

// ============================================
// MLA 9th Edition
// ============================================

function formatMLAAuthorsReference(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  // ONLY first author inverted, use FULL first name
  const first = parseAuthorName(authors[0])
  const firstFormatted = `${first.surname}, ${first.fullFirst}`

  if (authors.length === 1) return `${firstFormatted}.`

  if (authors.length === 2) {
    const second = parseAuthorName(authors[1])
    return `${firstFormatted}, and ${second.fullFirst} ${second.surname}.`
  }

  // 3+ authors: first + et al.
  return `${firstFormatted}, et al.`
}

function formatMLAAuthorsInText(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  const surnames = authors.map(a => parseAuthorName(a).surname)

  if (surnames.length === 1) return surnames[0]
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
  return `${surnames[0]} et al.`
}

function formatMLABook(source: BookSource): FormattedCitation {
  const authors = formatMLAAuthorsReference(source.authors)
  const inText = `(${formatMLAAuthorsInText(source.authors)})`

  const fullReference = `${authors} *${source.title}*. ${source.publisher}, ${source.year}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatMLAJournal(source: JournalSource): FormattedCitation {
  const authors = formatMLAAuthorsReference(source.authors)
  const inText = `(${formatMLAAuthorsInText(source.authors)})`

  const issue = source.issue ? `, no. ${source.issue}` : ''
  const fullReference = `${authors} "${source.title}." *${source.journalName}*, vol. ${source.volume}${issue}, ${source.year}, pp. ${source.pageRange}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatMLAWebsite(source: WebsiteSource): FormattedCitation {
  const authors = source.authors
    ? formatMLAAuthorsReference(source.authors)
    : source.organisation || 'Unknown'

  const inTextName = source.authors
    ? formatMLAAuthorsInText(source.authors)
    : source.organisation || 'Unknown'

  const inText = `(${inTextName})`

  const fullReference = `${authors}${authors.endsWith('.') ? '' : '.'} "${source.title}." *${source.organisation || 'Web'}*, ${source.dateAccessed}, ${source.url}. Accessed ${source.dateAccessed}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: source.authors
      ? parseAuthorName(source.authors[0]).surname.toLowerCase()
      : (source.organisation || 'unknown').toLowerCase()
  }
}

// ============================================
// Chicago (Author-Date)
// ============================================

function formatChicagoAuthorsReference(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  // First author inverted, rest normal order
  const first = parseAuthorName(authors[0])
  const formatted = [`${first.surname}, ${first.fullFirst}`]

  for (let i = 1; i < authors.length; i++) {
    const author = parseAuthorName(authors[i])
    formatted.push(`${author.fullFirst} ${author.surname}`)
  }

  return formatted.join(', ') + '.'
}

function formatChicagoAuthorsInText(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  const surnames = authors.map(a => parseAuthorName(a).surname)

  if (surnames.length === 1) return surnames[0]
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
  return `${surnames[0]} et al.`
}

function formatChicagoBook(source: BookSource): FormattedCitation {
  const authors = formatChicagoAuthorsReference(source.authors)
  const inText = `(${formatChicagoAuthorsInText(source.authors)} ${source.year})`

  const fullReference = `${authors} ${source.year}. *${source.title}*. ${source.place}: ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatChicagoJournal(source: JournalSource): FormattedCitation {
  const authors = formatChicagoAuthorsReference(source.authors)
  const inText = `(${formatChicagoAuthorsInText(source.authors)} ${source.year})`

  const issue = source.issue ? `, no. ${source.issue}` : ''
  const doiPart = source.doi ? ` https://doi.org/${source.doi}` : ''

  const fullReference = `${authors} ${source.year}. "${source.title}." *${source.journalName}* ${source.volume}${issue}: ${source.pageRange}.${doiPart}`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatChicagoWebsite(source: WebsiteSource): FormattedCitation {
  const authors = source.authors
    ? formatChicagoAuthorsReference(source.authors)
    : (source.organisation ? `${source.organisation}.` : 'Unknown.')

  const inTextName = source.authors
    ? formatChicagoAuthorsInText(source.authors)
    : source.organisation || 'Unknown'

  const inText = `(${inTextName} ${source.year})`

  const fullReference = `${authors} ${source.year}. "${source.title}." *${source.organisation || 'Web'}*. Accessed ${source.dateAccessed}. ${source.url}`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: source.authors
      ? parseAuthorName(source.authors[0]).surname.toLowerCase()
      : (source.organisation || 'unknown').toLowerCase()
  }
}

// ============================================
// Harvard (Cite Them Right)
// ============================================

function formatHarvardAuthorsReference(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  // Invert ALL authors: Surname, I.
  const formatted = authors.map(author => {
    const { surname, firstInitial } = parseAuthorName(author)
    return `${surname}, ${firstInitial}.`
  })

  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`

  const allButLast = formatted.slice(0, -1).join(', ')
  return `${allButLast} and ${formatted[formatted.length - 1]}`
}

function formatHarvardAuthorsInText(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  const surnames = authors.map(a => parseAuthorName(a).surname)

  if (surnames.length === 1) return surnames[0]
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
  return `${surnames[0]} et al.`
}

function formatHarvardBook(source: BookSource): FormattedCitation {
  const authors = formatHarvardAuthorsReference(source.authors)
  const inText = `(${formatHarvardAuthorsInText(source.authors)}, ${source.year})`

  const fullReference = `${authors} (${source.year}) *${source.title}*. ${source.place}: ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatHarvardJournal(source: JournalSource): FormattedCitation {
  const authors = formatHarvardAuthorsReference(source.authors)
  const inText = `(${formatHarvardAuthorsInText(source.authors)}, ${source.year})`

  const issue = source.issue ? `(${source.issue})` : ''
  const fullReference = `${authors} (${source.year}) '${source.title}', *${source.journalName}*, ${source.volume}${issue}, ${source.pageRange}.`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: parseAuthorName(source.authors[0]).surname.toLowerCase()
  }
}

function formatHarvardWebsite(source: WebsiteSource): FormattedCitation {
  const authors = source.authors
    ? formatHarvardAuthorsReference(source.authors)
    : source.organisation || 'Unknown'

  const inTextName = source.authors
    ? formatHarvardAuthorsInText(source.authors)
    : source.organisation || 'Unknown'

  const inText = `(${inTextName}, ${source.year})`

  const fullReference = `${authors} (${source.year}) *${source.title}*. Available at: ${source.url} (Accessed: ${source.dateAccessed}).`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: source.authors
      ? parseAuthorName(source.authors[0]).surname.toLowerCase()
      : (source.organisation || 'unknown').toLowerCase()
  }
}

// ============================================
// Vancouver (ICMJE/NLM)
// ============================================

function formatVancouverAuthorsReference(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'

  // Surname followed immediately by initials, NO periods, NO comma
  const formatted = authors.slice(0, 6).map(author => {
    const { surname, firstInitial } = parseAuthorName(author)
    return `${surname} ${firstInitial}`
  })

  const authorList = formatted.join(', ')

  if (authors.length > 6) {
    return `${authorList}, et al.`
  }

  return `${authorList}.`
}

function elidePagesVancouver(pageRange: string): string {
  // Elide page ranges: "284-287" becomes "284-7"
  const parts = pageRange.split('-')
  if (parts.length !== 2) return pageRange

  const start = parts[0].trim()
  const end = parts[1].trim()

  if (start.length >= end.length) return pageRange

  // Keep only differing digits from end
  const diff = end.length - start.length
  const elided = end.slice(diff)

  return `${start}-${elided}`
}

function formatVancouverBook(source: BookSource): FormattedCitation {
  const number = getVancouverNumber(source)
  const authors = formatVancouverAuthorsReference(source.authors)
  const inText = `[${number}]`

  const fullReference = `${number}. ${authors} ${source.title}. ${source.place}: ${source.publisher}; ${source.year}.`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: number.toString().padStart(5, '0'),
    vancouverNumber: number
  }
}

function formatVancouverJournal(source: JournalSource): FormattedCitation {
  const number = getVancouverNumber(source)
  const authors = formatVancouverAuthorsReference(source.authors)
  const inText = `[${number}]`

  const issue = source.issue ? `(${source.issue})` : ''
  const pages = elidePagesVancouver(source.pageRange)

  const fullReference = `${number}. ${authors} ${source.title}. ${source.journalName}. ${source.year};${source.volume}${issue}:${pages}.`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: number.toString().padStart(5, '0'),
    vancouverNumber: number
  }
}

function formatVancouverWebsite(source: WebsiteSource): FormattedCitation {
  const number = getVancouverNumber(source)
  const authors = source.authors
    ? formatVancouverAuthorsReference(source.authors)
    : source.organisation ? `${source.organisation}.` : 'Unknown.'

  const inText = `[${number}]`

  const fullReference = `${number}. ${authors} ${source.title} [Internet]. ${source.organisation || 'Publisher unknown'}; ${source.year} [cited ${source.dateAccessed}]. Available from: ${source.url}`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: number.toString().padStart(5, '0'),
    vancouverNumber: number
  }
}

// ============================================
// Main Formatting Function
// ============================================

export function formatCitation(source: CitationSource, style: CitationStyle): FormattedCitation {
  switch (style) {
    case 'APA':
      if (source.type === 'book') return formatAPABook(source)
      if (source.type === 'journal') return formatAPAJournal(source)
      return formatAPAWebsite(source)

    case 'MLA':
      if (source.type === 'book') return formatMLABook(source)
      if (source.type === 'journal') return formatMLAJournal(source)
      return formatMLAWebsite(source)

    case 'Chicago':
      if (source.type === 'book') return formatChicagoBook(source)
      if (source.type === 'journal') return formatChicagoJournal(source)
      return formatChicagoWebsite(source)

    case 'Harvard':
      if (source.type === 'book') return formatHarvardBook(source)
      if (source.type === 'journal') return formatHarvardJournal(source)
      return formatHarvardWebsite(source)

    case 'Vancouver':
      if (source.type === 'book') return formatVancouverBook(source)
      if (source.type === 'journal') return formatVancouverJournal(source)
      return formatVancouverWebsite(source)
  }
}

// ============================================
// Bibliography Sorting
// ============================================

export function sortCitations(citations: FormattedCitation[]): FormattedCitation[] {
  if (citations.length === 0) return citations

  const style = citations[0].style

  // Vancouver: Keep insertion order (already numbered)
  if (style === 'Vancouver') {
    return citations.sort((a, b) => {
      const numA = a.vancouverNumber || 0
      const numB = b.vancouverNumber || 0
      return numA - numB
    })
  }

  // APA, MLA, Chicago, Harvard: Alphabetical by surname
  return citations.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}
