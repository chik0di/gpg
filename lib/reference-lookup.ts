import { lookup } from 'node:dns/promises'
import { isIP, BlockList } from 'node:net'
import https from 'node:https'
import http from 'node:http'
import { parseDocument, DomUtils } from 'htmlparser2'
import { academicJson, lookupDoi, normalizeDoi, normalizeIsbn, plainText, type ReferenceMetadata } from './academic-metadata'

let nextLibrarySlot = 0
async function libraryJson<T>(url: string): Promise<T> {
  const slot = Math.max(Date.now(), nextLibrarySlot)
  nextLibrarySlot = slot + 1100
  if (slot > Date.now()) await new Promise(resolve => setTimeout(resolve, slot - Date.now()))
  return academicJson<T>(url)
}

const blockedIPv6 = new BlockList()
blockedIPv6.addSubnet('2001::', 23, 'ipv6')
blockedIPv6.addSubnet('2001:db8::', 32, 'ipv6')
blockedIPv6.addSubnet('2002::', 16, 'ipv6')

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0))
  }
  // Only globally routable IPv6 unicast; excludes mapped IPv4, loopback and local networks.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !blockedIPv6.check(address, 'ipv6')
}

export async function fetchPublicPage(input: string, redirects = 0, deadline = Date.now() + 12000): Promise<{ html: string; url: string }> {
  const url = new URL(input)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Use a public HTTP or HTTPS webpage link.')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('The webpage took too long to respond.')
  const addresses = await Promise.race([
    isIP(hostname) ? Promise.resolve([{ address: hostname, family: isIP(hostname) }]) : lookup(hostname, { all: true }),
    new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('The webpage took too long to respond.')), remaining); timer.unref() }),
  ])
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Only publicly accessible webpage links are supported.')
  if (redirects > 4) throw new Error('The webpage redirected too many times.')
  const response = await new Promise<{ html?: string; redirect?: string }>((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http
    const request = transport.get(url, {
      agent: false,
      headers: { 'User-Agent': 'GetPrimeGrade/1.0 (support@getprimegrade.com)', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
      // Pin the validated DNS address, preventing DNS changes between validation and connection.
      lookup: ((_host: string, options: { all?: boolean }, callback: Function) => {
        const address = addresses[0]
        if (options.all) callback(null, [address])
        else callback(null, address.address, address.family)
      }) as https.RequestOptions['lookup'],
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        res.resume(); resolve({ redirect: new URL(res.headers.location, url).href }); return
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('This webpage cannot be read automatically. Enter its details manually.')); return }
      if (!/^(text\/html|application\/xhtml\+xml)/i.test(res.headers['content-type'] || '')) { res.resume(); reject(new Error('Paste a webpage link rather than a file download.')); return }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 2 * 1024 * 1024) { request.destroy(new Error('This webpage is too large to read automatically.')); return }
        chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }))
    })
    const timer = setTimeout(() => request.destroy(new Error('The webpage took too long to respond.')), Math.max(1, deadline - Date.now()))
    request.on('close', () => clearTimeout(timer))
    request.on('error', reject)
  })
  if (response.redirect) return fetchPublicPage(response.redirect, redirects + 1, deadline)
  return { html: response.html || '', url: url.href }
}

export function webpageMetadata(html: string, url: string): ReferenceMetadata {
  const document = parseDocument(html)
  const meta = new Map<string, string[]>()
  for (const tag of DomUtils.getElementsByTagName('meta', document.children, true)) {
    const name = (tag.attribs.name || tag.attribs.property || '').toLowerCase()
    if (name && tag.attribs.content) meta.set(name, [...meta.get(name) || [], tag.attribs.content.trim()])
  }
  const value = (...names: string[]) => names.map(n => meta.get(n)?.[0]).find(Boolean) || ''
  const structured: Record<string, unknown>[] = []
  const collect = (data: unknown) => {
    if (Array.isArray(data)) data.forEach(collect)
    else if (data && typeof data === 'object') {
      const entry = data as Record<string, unknown>
      structured.push(entry)
      if (entry['@graph']) collect(entry['@graph'])
    }
  }
  for (const tag of DomUtils.getElementsByTagName('script', document.children, true)) {
    if (tag.attribs.type?.toLowerCase() === 'application/ld+json') {
      try { collect(JSON.parse(DomUtils.textContent(tag))) } catch { /* Some publishers emit invalid JSON-LD. */ }
    }
  }
  const article = structured.find(e => [e['@type']].flat().some(t => ['ScholarlyArticle', 'NewsArticle', 'Article', 'BlogPosting', 'WebPage', 'Book'].includes(String(t))))
  const string = (v: unknown): string => typeof v === 'string' ? v : ''
  const named = (v: unknown): string => string(v) || (v && typeof v === 'object' ? string((v as Record<string, unknown>).name) : '')
  const title = plainText(value('citation_title', 'og:title', 'dc.title') || string(article?.headline) || string(article?.name) || (DomUtils.getElementsByTagName('title', document.children, true)[0] ? DomUtils.textContent(DomUtils.getElementsByTagName('title', document.children, true)[0]) : ''))
  const authors = meta.get('citation_author') || (article?.author ? [article.author].flat().map(named).filter(Boolean) : meta.get('author') || meta.get('dc.creator') || [])
  const year = (value('citation_publication_date', 'article:published_time', 'date', 'dc.date') || string(article?.datePublished)).match(/\b(?:18|19|20)\d{2}\b/)?.[0] || ''
  const journalName = value('citation_journal_title')
  return {
    type: journalName ? 'journal' : article?.['@type'] === 'Book' ? 'book' : 'website',
    title: title.slice(0, 1000), authors: authors.slice(0, 100), year,
    journalName, volume: value('citation_volume'), issue: value('citation_issue'),
    pageRange: [value('citation_firstpage'), value('citation_lastpage')].filter(Boolean).join('-'),
    doi: normalizeDoi(value('citation_doi', 'dc.identifier')) || undefined,
    organisation: value('og:site_name') || named(article?.publisher),
    publisher: value('citation_publisher') || named(article?.publisher), url,
  }
}

export async function lookupReference(input: string): Promise<{ metadata: ReferenceMetadata; provider: string }> {
  const doi = normalizeDoi(input)
  if (doi) return { metadata: await lookupDoi(doi), provider: 'Crossref' }
  const isbn = normalizeIsbn(input)
  if (isbn) {
    interface Edition { title?: string; authors?: { key: string }[]; publish_date?: string; publishers?: string[]; publish_places?: string[]; works?: { key: string }[] }
    const edition = await libraryJson<Edition>(`https://openlibrary.org/isbn/${isbn}.json`)
    let authorKeys = edition.authors || []
    if (!authorKeys.length && edition.works?.[0]?.key && /^\/works\/OL\d+W$/.test(edition.works[0].key)) {
      const work = await libraryJson<{ authors?: { author: { key: string } }[] }>(`https://openlibrary.org${edition.works[0].key}.json`)
      authorKeys = (work.authors || []).map(a => a.author)
    }
    const authorResults = await Promise.allSettled(authorKeys.slice(0, 20).filter(a => /^\/authors\/OL\d+A$/.test(a.key)).map(a => libraryJson<{ name: string }>(`https://openlibrary.org${a.key}.json`)))
    if (!edition.title) throw new Error('No book details were found for this ISBN.')
    return { metadata: { type: 'book', title: edition.title, authors: authorResults.flatMap(a => a.status === 'fulfilled' && a.value.name ? [a.value.name] : []), year: edition.publish_date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0] || '', publisher: edition.publishers?.join('; '), place: edition.publish_places?.join('; '), url: `https://openlibrary.org/isbn/${isbn}` }, provider: 'Open Library' }
  }
  if (!/^https?:\/\//i.test(input)) throw new Error('Paste a valid DOI, ISBN-10, ISBN-13, or HTTP/HTTPS webpage URL.')
  const page = await fetchPublicPage(input)
  const metadata = webpageMetadata(page.html, page.url)
  if (metadata.doi) {
    try { return { metadata: await lookupDoi(metadata.doi), provider: 'Crossref' } } catch { /* Keep usable webpage metadata. */ }
  }
  if (!metadata.title) throw new Error('No citation details were found. Enter the source details manually.')
  return { metadata, provider: 'Webpage metadata' }
}
