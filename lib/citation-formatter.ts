/**
 * Citation Formatter Library
 * Pure functions for formatting citations in multiple styles
 * No AI or external APIs - rule-based string formatting only
 */

// ============================================
// Type Definitions
// ============================================

export type CitationStyle = 'APA' | 'Harvard' | 'Vancouver' | 'MLA' | 'Chicago'
export type SourceType = 'book' | 'website' | 'journal'

export interface BookSource {
  type: 'book'
  authors: string[] // Array of author names in "Surname, First Initial." format
  title: string
  year: string
  publisher: string
  place: string
}

export interface WebsiteSource {
  type: 'website'
  authors?: string[] // Optional - can be organisation name
  organisation?: string // Used if no individual authors
  title: string
  year: string
  url: string
  dateAccessed: string // Format: "DD Month YYYY"
}

export interface JournalSource {
  type: 'journal'
  authors: string[]
  title: string // Article title
  journalName: string
  year: string
  volume: string
  issue?: string // Optional
  pageRange: string // e.g., "123-145"
  doi?: string // Optional
}

export type CitationSource = BookSource | WebsiteSource | JournalSource

export interface FormattedCitation {
  inText: string
  fullReference: string
  style: CitationStyle
  sortKey: string // For alphabetical sorting (usually surname)
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format author names for in-text citations
 * Handles single, two, and three+ authors differently
 */
function formatAuthorsInText(authors: string[], style: CitationStyle): string {
  if (authors.length === 0) return 'Unknown'

  // Extract surnames from "Surname, First Initial." format
  const surnames = authors.map(author => author.split(',')[0].trim())

  if (style === 'APA' || style === 'Harvard' || style === 'Chicago') {
    if (surnames.length === 1) return surnames[0]
    if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
    return `${surnames[0]} et al.`
  }

  if (style === 'MLA') {
    if (surnames.length === 1) return surnames[0]
    if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
    return `${surnames[0]} et al.`
  }

  // Vancouver uses numbers, not author names in-text
  return ''
}

/**
 * Format author names for full reference
 */
function formatAuthorsFullReference(authors: string[], style: CitationStyle): string {
  if (authors.length === 0) return 'Unknown'

  if (style === 'APA') {
    // APA: Surname, I., & Surname, I.
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]}, & ${authors[1]}`
    const allButLast = authors.slice(0, -1).join(', ')
    return `${allButLast}, & ${authors[authors.length - 1]}`
  }

  if (style === 'Harvard') {
    // Harvard: Surname, I. and Surname, I.
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`
    const allButLast = authors.slice(0, -1).join(', ')
    return `${allButLast} and ${authors[authors.length - 1]}`
  }

  if (style === 'Vancouver') {
    // Vancouver: Surname I, Surname I
    const formatted = authors.map(a => a.replace(',', '')).join(', ')
    return formatted
  }

  if (style === 'MLA') {
    // MLA: Surname, First. and Surname, First.
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`
    const allButLast = authors.slice(0, -1).join(', ')
    return `${allButLast}, and ${authors[authors.length - 1]}`
  }

  if (style === 'Chicago') {
    // Chicago: Surname, First, and Surname, First
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`
    const allButLast = authors.slice(0, -1).join(', ')
    return `${allButLast}, and ${authors[authors.length - 1]}`
  }

  return authors.join(', ')
}

/**
 * Get sort key (first author's surname) for alphabetical sorting
 */
function getSortKey(authors?: string[]): string {
  if (!authors || authors.length === 0) return 'Unknown'
  return authors[0].split(',')[0].trim().toLowerCase()
}

// ============================================
// APA 7th Edition
// ============================================

function formatAPABook(source: BookSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'APA')
  const firstAuthor = formatAuthorsInText(source.authors, 'APA')

  const inText = `(${firstAuthor}, ${source.year})`
  const fullReference = `${authors} (${source.year}). *${source.title}*. ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: getSortKey(source.authors),
  }
}

function formatAPAWebsite(source: WebsiteSource): FormattedCitation {
  const author = source.authors
    ? formatAuthorsFullReference(source.authors, 'APA')
    : source.organisation || 'Unknown'

  const firstAuthor = source.authors
    ? formatAuthorsInText(source.authors, 'APA')
    : source.organisation || 'Unknown'

  const inText = `(${firstAuthor}, ${source.year})`
  const fullReference = `${author} (${source.year}). *${source.title}*. Retrieved ${source.dateAccessed}, from ${source.url}`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: source.authors ? getSortKey(source.authors) : (source.organisation || 'unknown').toLowerCase(),
  }
}

function formatAPAJournal(source: JournalSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'APA')
  const firstAuthor = formatAuthorsInText(source.authors, 'APA')

  const inText = `(${firstAuthor}, ${source.year})`

  const volumeIssue = source.issue
    ? `*${source.volume}*(${source.issue})`
    : `*${source.volume}*`

  const doiPart = source.doi ? ` https://doi.org/${source.doi}` : ''

  const fullReference = `${authors} (${source.year}). ${source.title}. *${source.journalName}*, ${volumeIssue}, ${source.pageRange}.${doiPart}`

  return {
    inText,
    fullReference,
    style: 'APA',
    sortKey: getSortKey(source.authors),
  }
}

// ============================================
// Harvard
// ============================================

function formatHarvardBook(source: BookSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'Harvard')
  const firstAuthor = formatAuthorsInText(source.authors, 'Harvard')

  const inText = `(${firstAuthor}, ${source.year})`
  const fullReference = `${authors} (${source.year}) *${source.title}*. ${source.place}: ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: getSortKey(source.authors),
  }
}

function formatHarvardWebsite(source: WebsiteSource): FormattedCitation {
  const author = source.authors
    ? formatAuthorsFullReference(source.authors, 'Harvard')
    : source.organisation || 'Unknown'

  const firstAuthor = source.authors
    ? formatAuthorsInText(source.authors, 'Harvard')
    : source.organisation || 'Unknown'

  const inText = `(${firstAuthor}, ${source.year})`
  const fullReference = `${author} (${source.year}) *${source.title}*. Available at: ${source.url} (Accessed: ${source.dateAccessed}).`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: source.authors ? getSortKey(source.authors) : (source.organisation || 'unknown').toLowerCase(),
  }
}

function formatHarvardJournal(source: JournalSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'Harvard')
  const firstAuthor = formatAuthorsInText(source.authors, 'Harvard')

  const inText = `(${firstAuthor}, ${source.year})`

  const volumeIssue = source.issue
    ? `${source.volume}(${source.issue})`
    : source.volume

  const doiPart = source.doi ? ` doi: ${source.doi}` : ''

  const fullReference = `${authors} (${source.year}) '${source.title}', *${source.journalName}*, ${volumeIssue}, pp. ${source.pageRange}.${doiPart}`

  return {
    inText,
    fullReference,
    style: 'Harvard',
    sortKey: getSortKey(source.authors),
  }
}

// ============================================
// Vancouver
// ============================================

let vancouverCounter = 1

export function resetVancouverCounter() {
  vancouverCounter = 1
}

function formatVancouverBook(source: BookSource): FormattedCitation {
  const num = vancouverCounter++
  const authors = formatAuthorsFullReference(source.authors, 'Vancouver')

  const inText = `[${num}]`
  const fullReference = `${num}. ${authors}. ${source.title}. ${source.place}: ${source.publisher}; ${source.year}.`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: num.toString().padStart(4, '0'), // Sort by number
  }
}

function formatVancouverWebsite(source: WebsiteSource): FormattedCitation {
  const num = vancouverCounter++
  const author = source.authors
    ? formatAuthorsFullReference(source.authors, 'Vancouver')
    : source.organisation || 'Unknown'

  const inText = `[${num}]`
  const fullReference = `${num}. ${author}. ${source.title} [Internet]. ${source.year} [cited ${source.dateAccessed}]. Available from: ${source.url}`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: num.toString().padStart(4, '0'),
  }
}

function formatVancouverJournal(source: JournalSource): FormattedCitation {
  const num = vancouverCounter++
  const authors = formatAuthorsFullReference(source.authors, 'Vancouver')

  const inText = `[${num}]`

  const volumeIssue = source.issue
    ? `${source.year};${source.volume}(${source.issue})`
    : `${source.year};${source.volume}`

  const doiPart = source.doi ? ` doi: ${source.doi}` : ''

  const fullReference = `${num}. ${authors}. ${source.title}. ${source.journalName}. ${volumeIssue}:${source.pageRange}.${doiPart}`

  return {
    inText,
    fullReference,
    style: 'Vancouver',
    sortKey: num.toString().padStart(4, '0'),
  }
}

// ============================================
// MLA 9th Edition
// ============================================

function formatMLABook(source: BookSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'MLA')
  const firstAuthor = formatAuthorsInText(source.authors, 'MLA')

  const inText = `(${firstAuthor})`
  const fullReference = `${authors}. *${source.title}*. ${source.publisher}, ${source.year}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: getSortKey(source.authors),
  }
}

function formatMLAWebsite(source: WebsiteSource): FormattedCitation {
  const author = source.authors
    ? formatAuthorsFullReference(source.authors, 'MLA')
    : source.organisation || 'Unknown'

  const firstAuthor = source.authors
    ? formatAuthorsInText(source.authors, 'MLA')
    : source.organisation || 'Unknown'

  const inText = `(${firstAuthor})`
  const fullReference = `${author}. "${source.title}." *${source.organisation || 'Website'}*, ${source.year}, ${source.url}. Accessed ${source.dateAccessed}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: source.authors ? getSortKey(source.authors) : (source.organisation || 'unknown').toLowerCase(),
  }
}

function formatMLAJournal(source: JournalSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'MLA')
  const firstAuthor = formatAuthorsInText(source.authors, 'MLA')

  const inText = `(${firstAuthor})`

  const volumeIssue = source.issue
    ? `vol. ${source.volume}, no. ${source.issue}`
    : `vol. ${source.volume}`

  const doiPart = source.doi ? `, doi:${source.doi}` : ''

  const fullReference = `${authors}. "${source.title}." *${source.journalName}*, ${volumeIssue}, ${source.year}, pp. ${source.pageRange}${doiPart}.`

  return {
    inText,
    fullReference,
    style: 'MLA',
    sortKey: getSortKey(source.authors),
  }
}

// ============================================
// Chicago (Author-Date)
// ============================================

function formatChicagoBook(source: BookSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'Chicago')
  const firstAuthor = formatAuthorsInText(source.authors, 'Chicago')

  const inText = `(${firstAuthor} ${source.year})`
  const fullReference = `${authors}. ${source.year}. *${source.title}*. ${source.place}: ${source.publisher}.`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: getSortKey(source.authors),
  }
}

function formatChicagoWebsite(source: WebsiteSource): FormattedCitation {
  const author = source.authors
    ? formatAuthorsFullReference(source.authors, 'Chicago')
    : source.organisation || 'Unknown'

  const firstAuthor = source.authors
    ? formatAuthorsInText(source.authors, 'Chicago')
    : source.organisation || 'Unknown'

  const inText = `(${firstAuthor} ${source.year})`
  const fullReference = `${author}. ${source.year}. "${source.title}." ${source.organisation || 'Website'}. Accessed ${source.dateAccessed}. ${source.url}.`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: source.authors ? getSortKey(source.authors) : (source.organisation || 'unknown').toLowerCase(),
  }
}

function formatChicagoJournal(source: JournalSource): FormattedCitation {
  const authors = formatAuthorsFullReference(source.authors, 'Chicago')
  const firstAuthor = formatAuthorsInText(source.authors, 'Chicago')

  const inText = `(${firstAuthor} ${source.year})`

  const volumeIssue = source.issue
    ? `${source.volume}, no. ${source.issue}`
    : source.volume

  const doiPart = source.doi ? ` https://doi.org/${source.doi}.` : '.'

  const fullReference = `${authors}. ${source.year}. "${source.title}." *${source.journalName}* ${volumeIssue}: ${source.pageRange}${doiPart}`

  return {
    inText,
    fullReference,
    style: 'Chicago',
    sortKey: getSortKey(source.authors),
  }
}

// ============================================
// Main Formatting Function
// ============================================

export function formatCitation(source: CitationSource, style: CitationStyle): FormattedCitation {
  // Route to appropriate formatter based on style and source type
  if (style === 'APA') {
    if (source.type === 'book') return formatAPABook(source)
    if (source.type === 'website') return formatAPAWebsite(source)
    if (source.type === 'journal') return formatAPAJournal(source)
  }

  if (style === 'Harvard') {
    if (source.type === 'book') return formatHarvardBook(source)
    if (source.type === 'website') return formatHarvardWebsite(source)
    if (source.type === 'journal') return formatHarvardJournal(source)
  }

  if (style === 'Vancouver') {
    if (source.type === 'book') return formatVancouverBook(source)
    if (source.type === 'website') return formatVancouverWebsite(source)
    if (source.type === 'journal') return formatVancouverJournal(source)
  }

  if (style === 'MLA') {
    if (source.type === 'book') return formatMLABook(source)
    if (source.type === 'website') return formatMLAWebsite(source)
    if (source.type === 'journal') return formatMLAJournal(source)
  }

  if (style === 'Chicago') {
    if (source.type === 'book') return formatChicagoBook(source)
    if (source.type === 'website') return formatChicagoWebsite(source)
    if (source.type === 'journal') return formatChicagoJournal(source)
  }

  throw new Error(`Unsupported style or source type: ${style}, ${source.type}`)
}

/**
 * Sort citations for bibliography
 * Different styles have different sorting rules
 */
export function sortCitations(citations: FormattedCitation[]): FormattedCitation[] {
  return [...citations].sort((a, b) => {
    // Vancouver is sorted by order of appearance (already numbered)
    if (a.style === 'Vancouver') {
      return a.sortKey.localeCompare(b.sortKey)
    }

    // All others sort alphabetically by author surname
    return a.sortKey.localeCompare(b.sortKey)
  })
}
