const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')

// Load the actual TypeScript modules without adding a second test framework.
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  module._compile(code, filename)
}
const { normalizeDoi, normalizeIsbn } = require('../lib/academic-metadata.ts')
const { mergeResearchSources, searchAcademicPapersDetailed } = require('../lib/research-materials.ts')
const { isPublicAddress, webpageMetadata, fetchPublicPage, lookupReference } = require('../lib/reference-lookup.ts')

async function main() {
  assert.equal(normalizeDoi('https://doi.org/10.1000/ABC'), '10.1000/abc')
  assert.equal(normalizeDoi('https://example.com/10.1000/abc'), null)
  assert.equal(normalizeIsbn('ISBN 978-0-14-032872-1'), '9780140328721')
  assert.equal(normalizeIsbn('0-8044-2957-X'), '080442957X')
  assert.equal(normalizeIsbn('9780140328722'), null)
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2001:0db8::1', '2001::1', '2002:7f00:1::']) assert.equal(isPublicAddress(ip), false, ip)
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip)
  await assert.rejects(fetchPublicPage('http://127.0.0.1/private'), /publicly/)
  await assert.rejects(fetchPublicPage('http://[::ffff:127.0.0.1]/private'), /publicly/)
  await assert.rejects(fetchPublicPage('https://user:password@example.com'), /public/)
  await assert.rejects(fetchPublicPage('http://example.com:8080'), /public/)

  // A public URL redirecting into a private network must be rejected before connection.
  const dns = require('node:dns/promises'), https = require('node:https'), { EventEmitter } = require('node:events')
  const originalLookup = dns.lookup, originalGet = https.get
  let connected = 0
  dns.lookup = async () => [{ address: '8.8.8.8', family: 4 }]
  https.get = (url, options, callback) => {
    connected++
    options.lookup(url.hostname, {}, (error, address) => { assert.equal(error, null); assert.equal(address, '8.8.8.8') })
    const req = new EventEmitter()
    req.destroy = error => { req.emit('error', error); req.emit('close') }
    queueMicrotask(() => {
      callback({ statusCode: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' }, resume() {} })
      req.emit('close')
    })
    return req
  }
  try { await assert.rejects(fetchPublicPage('https://public.example/article'), /publicly/); assert.equal(connected, 1) }
  finally { dns.lookup = originalLookup; https.get = originalGet }

  const metadata = webpageMetadata(`<title>Fallback title</title><meta property="og:title" content="Research &amp; learning"><meta name="citation_author" content="Smith, Ada"><meta name="citation_author" content="Jones, Ben"><meta name="citation_journal_title" content="Learning"><meta name="citation_publication_date" content="2024/01/05"><meta name="citation_firstpage" content="10"><meta name="citation_lastpage" content="20"><meta name="citation_doi" content="10.1000/test">`, 'https://example.com/article')
  assert.equal(metadata.type, 'journal')
  assert.equal(metadata.title, 'Research & learning')
  assert.deepEqual(metadata.authors, ['Smith, Ada', 'Jones, Ben'])
  assert.equal(metadata.pageRange, '10-20')
  assert.equal(metadata.year, '2024')
  const jsonLd = webpageMetadata(`<script type="application/ld+json">{"@graph":[{"@type":"Article","headline":"My article","author":{"@type":"Person","name":"Ada Smith"},"datePublished":"2023-04-01","publisher":{"name":"Example Press"}}]}</script>`, 'https://example.com')
  assert.equal(jsonLd.title, 'My article'); assert.deepEqual(jsonLd.authors, ['Ada Smith']); assert.equal(jsonLd.organisation, 'Example Press')

  const paper = { title: 'Machine learning in healthcare', authors: 'Ada Smith', year: 2024, url: 'https://doi.org/10.1000/test', hasFreeAccess: false, doi: '10.1000/test', source: 'Crossref' }
  const duplicates = mergeResearchSources([paper, { ...paper, title: 'Machine-learning in healthcare', source: 'OpenAlex', abstract: 'An informative abstract.', freeUrl: 'https://example.com/free', hasFreeAccess: true }], 'machine learning', 15)
  assert.equal(duplicates.length, 1); assert.equal(duplicates[0].hasFreeAccess, true); assert.equal(duplicates[0].pdfUrl, undefined)
  assert.equal(duplicates[0].abstract, 'An informative abstract.'); assert.match(duplicates[0].source, /Crossref.*OpenAlex/)
  assert.equal(mergeResearchSources([paper], 'learning', 15, { freeOnly: true }).length, 0)
  assert.equal(mergeResearchSources([paper], 'learning', 15, { fromYear: 2025 }).length, 0)
  assert.equal(mergeResearchSources([paper], 'learning', 15, { toYear: 2024 }).length, 1)

  const { formatCitation } = require('../lib/citation-formatter.ts')
  for (const style of ['APA', 'Harvard', 'Vancouver', 'MLA', 'Chicago']) {
    const citation = formatCitation({ type: 'journal', title: 'Online first', authors: ['Smith, Ada'], year: '2024', journalName: 'Learning', volume: '', pageRange: '' }, style)
    assert.ok(!/vol\. ,|pp\. \.|\*\*|, ,|;:/.test(citation.fullReference), citation.fullReference)
  }

  const originalFetch = global.fetch
  const work = { DOI: '10.1000/test', title: ['Machine learning in healthcare'], author: [{ family: 'Smith', given: 'Ada' }], type: 'journal-article', 'container-title': ['Learning Journal'], published: { 'date-parts': [[2024]] }, volume: '5', page: '10-20' }
  global.fetch = async url => {
    if (String(url).includes('semanticscholar')) return new Response('', { status: 429 })
    if (String(url).includes('openalex')) return Response.json({ results: [{ title: paper.title, id: 'https://openalex.org/W1', doi: paper.url, publication_year: 2024, best_oa_location: { landing_page_url: 'https://example.com/free', is_oa: true } }] })
    if (String(url).includes('crossref')) return Response.json({ message: { items: [work] } })
    throw new Error('Unexpected URL')
  }
  try {
    const result = await searchAcademicPapersDetailed('machine learning')
    assert.equal(result.sources.length, 1); assert.equal(result.warnings.length, 1)
    assert.equal(result.sources[0].pdfUrl, undefined); assert.equal(result.sources[0].freeUrl, 'https://example.com/free')
    assert.equal(result.sources[0].journal, 'Learning Journal')
    global.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(searchAcademicPapersDetailed('test'), /temporarily unavailable/)
    global.fetch = async () => Response.json({ message: work })
    const doi = await lookupReference('10.1000/test')
    assert.equal(doi.provider, 'Crossref'); assert.equal(doi.metadata.volume, '5'); assert.deepEqual(doi.metadata.authors, ['Smith, Ada'])
    global.fetch = async url => String(url).includes('/authors/') ? Response.json({ name: 'Roald Dahl' }) : Response.json({ title: 'Fantastic Mr. Fox', publish_date: '1988', publishers: ['Puffin'], authors: [{ key: '/authors/OL34184A' }] })
    const book = await lookupReference('9780140328721')
    assert.equal(book.metadata.type, 'book'); assert.equal(book.metadata.year, '1988'); assert.deepEqual(book.metadata.authors, ['Roald Dahl'])
  } finally { global.fetch = originalFetch }
  console.log('Academic tools checks passed: identifier validation, public-address restrictions, webpage metadata, duplicate enrichment, filters, partial failures, DOI and ISBN lookup.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
