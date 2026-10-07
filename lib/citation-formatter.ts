/** Common book, webpage and journal references: APA 7, Cite Them Right Harvard,
 * ICMJE Vancouver, MLA 9 and Chicago 18 author–date.
 * Keep source capitalization and verified journal abbreviations supplied by the user.
 */
export type CitationStyle = 'APA' | 'Harvard' | 'Vancouver' | 'MLA' | 'Chicago'
export type SourceType = 'book' | 'website' | 'journal'
export interface BookSource {
  type: 'book'; authors: string[]; title: string; year: string; publisher: string; place: string
  edition?: string; isbn?: string
}
export interface WebsiteSource {
  type: 'website'; authors?: string[]; organisation?: string; title: string; year: string
  url: string; dateAccessed: string; publicationDate?: string; siteName?: string; changesOverTime?: boolean; place?: string
}
export interface JournalSource {
  type: 'journal'; authors: string[]; title: string; journalName: string; year: string
  volume: string; issue?: string; pageRange: string; doi?: string; articleNumber?: string; journalAbbreviation?: string
}
export type CitationSource = BookSource | WebsiteSource | JournalSource
export interface CitationRun { text: string; italic?: boolean }
export interface FormattedCitation {
  inText: string; fullReference: string; style: CitationStyle; sortKey: string
  vancouverNumber?: number; runs?: CitationRun[]; source?: CitationSource
}

let counter = 0
const numbers = new Map<string, number>()
export function resetVancouverCounter() { counter = 0; numbers.clear() }

export function citationIdentity(source: CitationSource): string {
  if (source.type === 'journal' && source.doi) return `journal:${doiValue(source.doi)}`
  if (source.type === 'book' && source.isbn) return `book:${source.isbn.replace(/[\s-]/g, '')}`
  if (source.type === 'website') return `website:${source.url.trim()}`
  return JSON.stringify(Object.fromEntries(Object.entries(source).sort(([a], [b]) => a.localeCompare(b))))
}
function numberFor(source: CitationSource) {
  const key = citationIdentity(source)
  if (!numbers.has(key)) numbers.set(key, ++counter)
  return numbers.get(key)!
}
function name(author: string) {
  const [surname, ...parts] = author.trim().split(',')
  const given = parts.join(',').trim()
  const initials = given.split(/\s+/).filter(Boolean).map(part => part.split('-').map(piece =>
    (piece.match(/\p{L}[\p{L}\p{M}]*/gu) || []).map(word => `${word[0].toUpperCase()}.`).join(' ')
  ).join('-')).join(' ')
  return { surname: surname.trim(), given, initials, normal: given ? `${given} ${surname.trim()}` : surname.trim() }
}
export function authorInitials(author: string) { const n = name(author); return n.initials ? `${n.surname}, ${n.initials}` : n.surname }
function joinAnd(items: string[], oxford = true) {
  return items.length < 2 ? items[0] || '' : `${items.slice(0, -1).join(', ')}${oxford ? ',' : ''} and ${items.at(-1)}`
}
function authorList(authors: string[], style: CitationStyle) {
  if (style === 'APA') {
    const items = authors.map(authorInitials)
    if (items.length > 20) return `${items.slice(0, 19).join(', ')}, . . . ${items.at(-1)}`
    return items.length < 2 ? items[0] || '' : `${items.slice(0, -1).join(', ')}, & ${items.at(-1)}`
  }
  if (style === 'Harvard') return authors.length >= 4 ? `${authorInitials(authors[0]).replace(/\. /g, '.')} et al.` : joinAnd(authors.map(a => authorInitials(a).replace(/\. /g, '.')), false)
  if (style === 'Vancouver') return `${authors.slice(0, 6).map(a => { const n = name(a); return n.initials ? `${n.surname} ${n.initials.replace(/[^\p{L}]/gu, '')}` : n.surname }).join(', ')}${authors.length > 6 ? ', et al.' : ''}`
  const items = authors.map((a, i) => { const n = name(a); return i === 0 && n.given ? `${n.surname}, ${n.given}` : n.normal })
  if (style === 'MLA') return items.length > 2 ? `${items[0]}, et al.` : joinAnd(items)
  return items.length > 6 ? `${items.slice(0, 3).join(', ')}, et al.` : joinAnd(items)
}
function authorInText(authors: string[], style: CitationStyle) {
  const surnames = authors.map(a => name(a).surname)
  const cutoff = style === 'Harvard' ? 4 : 3
  if (surnames.length >= cutoff) return `${surnames[0]} et al.`
  if (style === 'APA' && surnames.length === 2) return surnames.join(' & ')
  return joinAnd(surnames, false)
}
function sourceYear(source: CitationSource) {
  return source.year.trim() || (source.type === 'website' ? String(citationDate(source.publicationDate || '')?.year || '') : '')
}
function yearValue(year: string, style: CitationStyle) {
  return !year.trim() || /^(n\.?d\.?|no date)$/i.test(year.trim()) ? style === 'Harvard' ? 'no date' : style === 'Vancouver' ? '[date unknown]' : 'n.d.' : year.trim()
}
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function citationDate(value: string): { year: number; month: number; day: number } | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/)
  const uk = value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i)
  const us = value.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i)
  const year = Number(iso?.[1] || uk?.[3] || us?.[3])
  const month = iso ? Number(iso[2]) : months.findIndex(m => m.toLowerCase().startsWith((uk?.[2] || us?.[1] || 'invalid').toLowerCase())) + 1
  const day = Number(iso?.[3] || uk?.[1] || us?.[2])
  const date = new Date(Date.UTC(year, month - 1, day))
  return year >= 1500 && month > 0 && day > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { year, month, day } : null
}
function dateText(value: string, style: CitationStyle) {
  const d = citationDate(value)
  if (!d) return value.trim()
  if (style === 'Vancouver') return `${d.year} ${months[d.month - 1].slice(0, 3)} ${d.day}`
  if (style === 'Chicago' || style === 'APA') return `${months[d.month - 1]} ${d.day}, ${d.year}`
  return `${d.day} ${style === 'MLA' ? ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'][d.month - 1] : months[d.month - 1]} ${d.year}`
}
function doiValue(doi: string) { return doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase() }
function period(value: string) { return value && !/[.!?]$/.test(value) ? `${value}.` : value }
function italic(text: string): CitationRun { return { text, italic: true } }
function ranges(pages: string) { return pages.replace(/(?<=\d)\s*[-–]\s*(?=\d)/g, '–') }
function shortPages(pages: string, chicago = false) {
  return pages.replace(/(\d+)[-–](\d+)/g, (_, start: string, end: string) => {
    if (start.length !== end.length || Number(end) < Number(start)) return `${start}${chicago ? '–' : '-'}${end}`
    let common = 0
    while (common < start.length - 1 && start[common] === end[common]) common++
    if (chicago) {
      if (Number(start) < 100 || Number(start) % 100 === 0) common = 0
      else if (Number(start) % 100 >= 10) common = Math.min(common, end.length - 2)
    }
    return `${start}${chicago ? '–' : '-'}${end.slice(common)}`
  })
}
function editionText(edition: string | undefined, style: CitationStyle) {
  if (!edition?.trim()) return ''
  const value = edition.trim().replace(/\.$/, '')
  const num = value.match(/^(\d+)(?:st|nd|rd|th)?(?:\s+(?:ed\.?|edn\.?|edition))?$/i)?.[1]
  if (num === '1') return ''
  const n = Number(num)
  const ordinal = num ? `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}` : value.replace(/\s+(?:edition|edn\.?|ed\.?)$/i, '')
  return `${ordinal} ${style === 'Harvard' ? 'edn.' : 'ed.'}`
}

export function formatCitation(source: CitationSource, style: CitationStyle, vancouverNumber?: number): FormattedCitation {
  const authors = (source.authors || []).filter(a => a.trim())
  const corporate = source.type === 'website' ? source.organisation?.trim() : undefined
  const mlaCorporatePublisher = style === 'MLA' && source.type === 'website' && !authors.length && corporate && corporate === (source.siteName || source.organisation)
  const author = mlaCorporatePublisher ? '' : authors.length ? authorList(authors, style) : corporate || ''
  const inName = mlaCorporatePublisher ? `“${source.title}”` : authors.length ? authorInText(authors, style) : corporate || source.title
  const year = yearValue(sourceYear(source), style)
  const number = style === 'Vancouver' ? vancouverNumber || numberFor(source) : undefined
  const inText = style === 'Vancouver' ? `[${number}]` : style === 'MLA' ? `(${inName})` : `(${inName}${style === 'Chicago' ? ' ' : ', '}${year})`
  const runs: CitationRun[] = []
  const add = (...items: (string | CitationRun)[]) => items.forEach(item => { if (typeof item === 'string' ? item : item.text) runs.push(typeof item === 'string' ? { text: item } : item) })
  const authorPeriod = author ? `${period(author)} ` : ''
  if (number) add(`${number}. `)

  if (source.type === 'book') {
    const edition = editionText(source.edition, style)
    if (style === 'APA') {
      if (author) add(`${author} (${year}). `)
      add(italic(source.title), edition ? ` (${edition})` : '', !edition && /[.!?]$/.test(source.title) ? ' ' : '. ')
      if (!author) add(`(${year}). `)
      if (source.publisher && source.publisher !== author) add(period(source.publisher))
    } else if (style === 'Harvard') {
      if (author) add(`${author} (${year}) `)
      add(italic(source.title), /[.!?]$/.test(source.title) ? ' ' : '. ', !author ? `(${year}). ` : '', edition ? `${edition} ` : '', period(source.publisher))
    } else if (style === 'MLA') add(authorPeriod, italic(source.title), /[.!?]$/.test(source.title) ? ' ' : '. ', edition ? `${edition}, ` : '', [source.publisher, year === 'n.d.' ? '' : year].filter(Boolean).join(', '), '.')
    else if (style === 'Chicago') add(authorPeriod, author ? `${year}. ` : '', italic(source.title), /[.!?]$/.test(source.title) ? ' ' : '. ', !author ? `${year}. ` : '', edition ? `${edition} ` : '', period(source.publisher))
    else add(authorPeriod, period(source.title), ' ', edition ? `${edition} ` : '', `${source.place || '[place unknown]'}: ${source.publisher || '[publisher unknown]'}; ${year}.`)
  } else if (source.type === 'journal') {
    const doi = source.doi ? `https://doi.org/${doiValue(source.doi)}` : ''
    const pages = ranges(source.pageRange.trim())
    const article = source.articleNumber?.trim()
    if (style === 'APA') {
      if (author) add(`${author} (${year}). `)
      add(period(source.title), ' ', !author ? `(${year}). ` : '', italic(source.journalName))
      if (source.volume) add(', ', italic(source.volume))
      add(source.issue ? `(${source.issue})` : '', article ? `, Article ${article}` : pages ? `, ${pages}` : '', '.', doi ? ` ${doi}` : '')
    } else if (style === 'Harvard') {
      add(author ? `${author} (${year}) ` : '', `'${source.title}'`, !author ? ` (${year})` : '', ', ', italic(source.journalName), source.volume ? `, ${source.volume}` : '', source.issue ? `(${source.issue})` : '', article ? `, article ${article}` : pages ? `, ${pages.includes('–') ? 'pp.' : 'p.'} ${pages}` : '', '.', doi ? ` Available at: ${doi}` : '')
    } else if (style === 'MLA') {
      add(authorPeriod, `“${period(source.title)}” `, italic(source.journalName), source.volume ? `, vol. ${source.volume}` : '', source.issue ? `, no. ${source.issue}` : '', source.year ? `, ${year}` : '', article ? `, article ${article}` : pages ? `, ${pages.includes('–') ? 'pp.' : 'p.'} ${pages}` : '', doi ? `, ${doi}.` : '.')
    } else if (style === 'Chicago') {
      add(authorPeriod, author ? `${year}. ` : '', `“${period(source.title)}” `, !author ? `${year}. ` : '', italic(source.journalName), source.volume ? ` ${source.volume}` : '', source.issue ? ` (${source.issue})` : '', article ? `: ${article}` : pages ? `: ${shortPages(pages, true)}` : '', '.', doi ? ` ${doi}.` : '')
    } else {
      add(authorPeriod, period(source.title), ' ', period(source.journalAbbreviation || source.journalName), ` ${year}`, source.volume || source.issue ? `;${source.volume}${source.issue ? `(${source.issue})` : ''}` : '', article ? `:${article}` : pages ? `:${shortPages(pages)}` : '', '.', doi ? ` doi: ${doiValue(source.doi!)}.` : '')
    }
  } else {
    const published = source.publicationDate ? citationDate(source.publicationDate) : null
    const site = source.siteName || source.organisation || ''
    if (style === 'APA') {
      const date = published ? `${year}, ${months[published.month - 1]} ${published.day}` : year
      if (author) add(`${author} (${date}). `)
      add(italic(source.title), /[.!?]$/.test(source.title) ? ' ' : '. ', !author ? `(${date}). ` : '', site && site !== author ? `${period(site)} ` : '', source.changesOverTime ? `Retrieved ${dateText(source.dateAccessed, 'APA')}, from ` : '', source.url)
    } else if (style === 'Harvard') add(author ? `${author} (${year}) ` : '', italic(source.title), !author ? ` (${year})` : '', `. Available at: ${source.url} (Accessed: ${dateText(source.dateAccessed, 'Harvard')}).`)
    else if (style === 'MLA') add(authorPeriod, `“${period(source.title)}” `, site && site !== author ? italic(site) : '', site && site !== author ? ', ' : '', published ? `${dateText(source.publicationDate!, 'MLA')}, ` : source.year && year !== 'n.d.' ? `${year}, ` : '', source.url, '.', source.dateAccessed ? ` Accessed ${dateText(source.dateAccessed, 'MLA')}.` : '')
    else if (style === 'Chicago') add(authorPeriod, author ? `${year}. ` : '', `“${period(source.title)}” `, !author ? `${year}. ` : '', site && site !== author ? `${period(site)} ` : '', published ? `${months[published.month - 1]} ${published.day}. ` : year.startsWith('n.d.') ? `Accessed ${dateText(source.dateAccessed, 'Chicago')}. ` : '', `${source.url}.`)
    else add(authorPeriod, `${source.title} [Internet]. ${source.place || '[place unknown]'}: ${site || '[publisher unknown]'}; ${published ? dateText(source.publicationDate!, 'Vancouver') : year} [cited ${dateText(source.dateAccessed, 'Vancouver')}]. Available from: ${source.url}`)
  }
  const fullReference = runs.map(run => run.italic ? `*${run.text}*` : run.text).join('').trim()
  return { inText, fullReference, style, sortKey: (authors[0] ? name(authors[0]).surname : corporate || source.title).toLowerCase(), vancouverNumber: number, runs, source }
}

export function citationPlainText(citation: FormattedCitation) {
  return citation.runs ? citation.runs.map(run => run.text).join('').trim() : citation.fullReference.replace(/\*/g, '')
}
function authorKey(source: CitationSource) { return (source.authors?.length ? source.authors.map(a => a.trim()).join('|') : source.type === 'website' && source.organisation ? source.organisation : source.title).toLowerCase() }
function titleKey(title: string) { return title.toLowerCase().replace(/^(the|a|an)\s+/, '') }
function dateSort(a: string, b: string) {
  const undated = (value: string) => !value || /^(n\.?d\.?|no date)$/i.test(value)
  return undated(a) && undated(b) ? 0 : undated(a) ? -1 : undated(b) ? 1 : a.localeCompare(b, undefined, { numeric: true })
}
export function formatBibliography(sources: CitationSource[], style: CitationStyle): FormattedCitation[] {
  const unique = [...new Map(sources.map(s => [citationIdentity(s), s])).values()]
  if (style === 'Vancouver') return unique.map((source, i) => formatCitation(source, style, i + 1))
  unique.sort((a, b) => authorKey(a).localeCompare(authorKey(b)) || (style === 'MLA' ? 0 : dateSort(sourceYear(a), sourceYear(b))) || titleKey(a.title).localeCompare(titleKey(b.title)))
  const groups = new Map<string, CitationSource[]>()
  if (style !== 'MLA') for (const source of unique) {
    const key = `${authorKey(source)}|${yearValue(sourceYear(source), style)}`
    groups.set(key, [...groups.get(key) || [], source])
  }
  return unique.map(source => {
    const group = groups.get(`${authorKey(source)}|${yearValue(sourceYear(source), style)}`)
    const index = group?.indexOf(source) || 0
    let suffix = '', n = index
    do { suffix = String.fromCharCode(97 + n % 26) + suffix; n = Math.floor(n / 26) - 1 } while (n >= 0)
    const year = group && group.length > 1 ? `${yearValue(sourceYear(source), style)}${['n.d.', 'no date'].includes(yearValue(sourceYear(source), style)) ? '-' : ''}${suffix}` : sourceYear(source)
    const citation = formatCitation({ ...source, year }, style)
    return { ...citation, source }
  })
}
export function sortCitations(citations: FormattedCitation[]): FormattedCitation[] {
  return [...citations].sort((a, b) => a.style.localeCompare(b.style) || (a.style === 'Vancouver' ? (a.vancouverNumber || 0) - (b.vancouverNumber || 0) : a.sortKey.localeCompare(b.sortKey)))
}
