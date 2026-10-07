import { academicJson, type ReferenceMetadata } from './academic-metadata'

let nextSlot = 0
const cache = new Map<string, { until: number; promise: Promise<unknown> }>()
async function libraryJson<T>(path: string): Promise<T> {
  const cached = cache.get(path)
  if (cached && cached.until > Date.now()) return cached.promise as Promise<T>
  if (cache.size >= 200) cache.delete(cache.keys().next().value!)
  const promise = (async () => {
    const slot = Math.max(Date.now(), nextSlot)
    nextSlot = slot + 1100
    if (slot > Date.now()) await new Promise(resolve => setTimeout(resolve, slot - Date.now()))
    return academicJson<T>(`https://openlibrary.org${path}`)
  })()
  cache.set(path, { until: Date.now() + 300000, promise })
  try { return await promise } catch (error) { cache.delete(path); throw error }
}
export interface BookMatch { key: string; title: string; authors: string[]; firstYear?: number; editionCount: number }
export interface BookEdition {
  key: string; title: string; date: string; publishers: string[]; places: string[]
  isbn?: string; edition?: string; languages: string[]
}
interface EditionRecord {
  key: string; title?: string; subtitle?: string; authors?: { key: string }[]
  publish_date?: string; publishers?: string[]; publish_places?: string[]; works?: { key: string }[]
  isbn_13?: string[]; isbn_10?: string[]; edition_name?: string; languages?: { key: string }[]
}
export async function searchBooks(title: string, author: string, page = 1) {
  const query = new URLSearchParams({ title, limit: '10', page: String(page), fields: 'key,title,author_name,first_publish_year,edition_count' })
  if (author) query.set('author', author)
  const data = await libraryJson<{ docs: { key: string; title: string; author_name?: string[]; first_publish_year?: number; edition_count?: number }[]; numFound: number }>(`/search.json?${query}`)
  if (!Array.isArray(data.docs)) throw new Error('Invalid book database response.')
  return { books: data.docs.filter(b => /^\/works\/OL\d+W$/.test(b.key)).map(b => ({ key: b.key, title: b.title, authors: b.author_name || [], firstYear: b.first_publish_year, editionCount: b.edition_count || 0 })), hasMore: page * 10 < data.numFound }
}
export async function bookEditions(workKey: string, page = 1) {
  if (!/^\/works\/OL\d+W$/.test(workKey)) throw new Error('Invalid book identifier.')
  const data = await libraryJson<{ entries: EditionRecord[]; size: number }>(`${workKey}/editions.json?limit=20&offset=${(page - 1) * 20}`)
  if (!Array.isArray(data.entries)) throw new Error('Invalid edition database response.')
  return { editions: data.entries.filter(e => /^\/books\/OL\d+M$/.test(e.key)).map(e => ({ key: e.key, title: [e.title, e.subtitle].filter(Boolean).join(': '), date: e.publish_date || '', publishers: e.publishers || [], places: e.publish_places || [], isbn: e.isbn_13?.[0] || e.isbn_10?.[0], edition: e.edition_name, languages: (e.languages || []).map(l => l.key.split('/').at(-1) || '') })), hasMore: page * 20 < data.size }
}
export async function lookupBook(identifier: string): Promise<ReferenceMetadata> {
  if (!/^\d{9}[\dX]$|^\d{13}$|^\/books\/OL\d+M$/.test(identifier)) throw new Error('Invalid book edition or ISBN.')
  const edition = await libraryJson<EditionRecord>(identifier.startsWith('/books/') ? `${identifier}.json` : `/isbn/${identifier}.json`)
  let authorKeys = edition.authors || []
  if (!authorKeys.length && edition.works?.[0]?.key && /^\/works\/OL\d+W$/.test(edition.works[0].key)) {
    const work = await libraryJson<{ authors?: { author: { key: string } }[] }>(`${edition.works[0].key}.json`)
    authorKeys = (work.authors || []).map(a => a.author)
  }
  const authors = await Promise.allSettled(authorKeys.slice(0, 20).filter(a => /^\/authors\/OL\d+A$/.test(a.key)).map(a => libraryJson<{ name: string }>(`${a.key}.json`)))
  if (!edition.title) throw new Error('No book details were found for this edition.')
  return { type: 'book', title: [edition.title, edition.subtitle].filter(Boolean).join(': '), authors: authors.flatMap(a => a.status === 'fulfilled' && a.value.name ? [a.value.name] : []), year: edition.publish_date?.match(/\b(?:1[5-9]|20)\d{2}\b/)?.[0] || '', publisher: edition.publishers?.join('; '), place: edition.publish_places?.join('; '), edition: edition.edition_name, isbn: edition.isbn_13?.[0] || edition.isbn_10?.[0] || (identifier.startsWith('/books/') ? undefined : identifier), url: edition.key ? `https://openlibrary.org${edition.key}` : `https://openlibrary.org/isbn/${identifier}` }
}
