'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  formatCitation,
  formatBibliography,
  citationIdentity,
  citationPlainText,
  authorInitials,
  type CitationStyle,
  type SourceType,
  type CitationSource,
  type FormattedCitation,
  type BookSource,
  type WebsiteSource,
  type JournalSource,
} from '@/lib/citation-formatter'

import AcademicIcon from '@/components/shared/academic-icon'
import AccountBibliography from '@/components/resources-account-bibliography'
import BookTitleSearch from '@/components/resources-book-title-search'
import { citationSourceSchema } from '@/lib/citation-source-validation'
import type { ReferenceMetadata } from '@/lib/academic-metadata'

const STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'APA', label: 'APA 7th' },
  { value: 'Harvard', label: 'Harvard (Cite Them Right)' },
  { value: 'Vancouver', label: 'Vancouver' },
  { value: 'MLA', label: 'MLA 9th' },
  { value: 'Chicago', label: 'Chicago 18 (author–date)' },
]

const SOURCE_TYPES: { value: SourceType; label: string; icon: SourceType }[] = [
  { value: 'book', label: 'Book', icon: 'book' },
  { value: 'website', label: 'Website', icon: 'website' },
  { value: 'journal', label: 'Journal article', icon: 'journal' },
]

export default function ReferenceGeneratorClient() {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('APA')
  const [sourceType, setSourceType] = useState<SourceType>('book')
  const [generatedSource, setGeneratedSource] = useState<CitationSource | null>(null)
  const [bibliographySources, setBibliographySources] = useState<CitationSource[]>([])
  const [editingIdentity, setEditingIdentity] = useState<string | null>(null)
  const [legacyBibliography, setLegacyBibliography] = useState<FormattedCitation[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [formError, setFormError] = useState('')
  const [bibliographyMessage, setBibliographyMessage] = useState('')
  const bibliography = useMemo(() => formatBibliography(bibliographySources, selectedStyle), [bibliographySources, selectedStyle])
  const generatedCitation = useMemo(() => {
    if (!generatedSource) return null
    return formatBibliography([...bibliographySources, generatedSource], selectedStyle).find(c => c.source && citationIdentity(c.source) === citationIdentity(generatedSource)) || formatCitation(generatedSource, selectedStyle)
  }, [generatedSource, bibliographySources, selectedStyle])
  const [copySuccess, setCopySuccess] = useState(false)
  const [copiedInText, setCopiedInText] = useState(false)
  const [copiedFullRef, setCopiedFullRef] = useState(false)

  // Book form state
  const [bookAuthors, setBookAuthors] = useState('')
  const [bookTitle, setBookTitle] = useState('')
  const [bookYear, setBookYear] = useState('')
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookPlace, setBookPlace] = useState('')
  const [bookEdition, setBookEdition] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')

  // Website form state
  const [webAuthors, setWebAuthors] = useState('')
  const [webOrganisation, setWebOrganisation] = useState('')
  const [webTitle, setWebTitle] = useState('')
  const [webYear, setWebYear] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [webDateAccessed, setWebDateAccessed] = useState('')
  const [webPublicationDate, setWebPublicationDate] = useState('')
  const [webSiteName, setWebSiteName] = useState('')
  const [webPlace, setWebPlace] = useState('')
  const [webChangesOverTime, setWebChangesOverTime] = useState(false)

  // Journal form state
  const [journalAuthors, setJournalAuthors] = useState('')
  const [journalTitle, setJournalTitle] = useState('')
  const [journalName, setJournalName] = useState('')
  const [journalYear, setJournalYear] = useState('')
  const [journalVolume, setJournalVolume] = useState('')
  const [journalIssue, setJournalIssue] = useState('')
  const [journalPageRange, setJournalPageRange] = useState('')
  const [journalDoi, setJournalDoi] = useState('')
  const [journalArticleNumber, setJournalArticleNumber] = useState('')
  const [journalAbbreviation, setJournalAbbreviation] = useState('')

  const [lookupMode, setLookupMode] = useState<'identifier' | 'book'>('identifier')
  const [lookupInput, setLookupInput] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')
  const [lookupError, setLookupError] = useState('')
  const lookupController = useRef<AbortController | null>(null)
  const handoffStarted = useRef(false)

  function applyMetadata(metadata: ReferenceMetadata, provider: string) {
    clearForm()
    setSourceType(metadata.type)
    if (metadata.type === 'book') {
      setBookAuthors(metadata.authors.join('; ')); setBookTitle(metadata.title); setBookYear(metadata.year)
      setBookPublisher(metadata.publisher || ''); setBookPlace(metadata.place || ''); setBookEdition(metadata.edition || ''); setBookIsbn(metadata.isbn || '')
    } else if (metadata.type === 'journal') {
      setJournalAuthors(metadata.authors.join('; ')); setJournalTitle(metadata.title); setJournalYear(metadata.year)
      setJournalName(metadata.journalName || ''); setJournalVolume(metadata.volume || '')
      setJournalIssue(metadata.issue || ''); setJournalPageRange(metadata.pageRange || ''); setJournalDoi(metadata.doi || ''); setJournalArticleNumber(metadata.articleNumber || '')
    } else {
      setWebAuthors(metadata.authors.join('; ')); setWebTitle(metadata.title); setWebYear(metadata.year)
      setWebOrganisation(metadata.organisation || ''); setWebUrl(metadata.url || ''); setWebPublicationDate(metadata.publicationDate || ''); setWebSiteName(metadata.siteName || '')
      setWebDateAccessed(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    }
    setLookupMessage(`Details retrieved from ${provider}. Check the source type and every field below; fill in any missing details before generating your reference.`)
  }

  async function retrieveReference(input: string) {
    lookupController.current?.abort()
    const controller = new AbortController()
    lookupController.current = controller
    setLookupLoading(true); setLookupMessage(''); setLookupError('')
    try {
      const response = await fetch('/api/resources/reference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }), signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Lookup failed. Enter the details manually.')
      applyMetadata(data.metadata, data.provider)
    } catch (error) {
      if (!controller.signal.aborted) setLookupError(error instanceof Error ? error.message : 'Lookup failed. Enter the details manually.')
    } finally {
      if (!controller.signal.aborted) setLookupLoading(false)
    }
  }

  useEffect(() => {
    const input = new URLSearchParams(window.location.search).get('lookup')
    if (input && !handoffStarted.current) {
      handoffStarted.current = true
      setLookupInput(input)
      void retrieveReference(input)
    }
    // Lookup runs once when arriving from the Research Finder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('gpg_bibliography') || 'null')
      if (saved?.version === 2 && STYLES.some(style => style.value === saved.style)) setSelectedStyle(saved.style)
      const sources = saved?.version === 2 ? saved.sources : Array.isArray(saved) ? saved.flatMap((entry: FormattedCitation) => entry.source ? [entry.source] : []) : []
      setBibliographySources((sources || []).flatMap((source: unknown) => { const parsed = citationSourceSchema.safeParse(source); return parsed.success ? [parsed.data] : [] }))
      const legacy = saved?.version === 2 ? saved.legacy : Array.isArray(saved) ? saved.filter((entry: FormattedCitation) => !entry.source) : []
      setLegacyBibliography((legacy || []).filter((entry: FormattedCitation) => typeof entry.fullReference === 'string' && STYLES.some(style => style.value === entry.style)))
    } catch { /* An invalid browser draft must not prevent using the generator. */ }
    setStorageReady(true)
  }, [])
  useEffect(() => {
    if (!storageReady) return
    try {
      if (bibliographySources.length || legacyBibliography.length) sessionStorage.setItem('gpg_bibliography', JSON.stringify({ version: 2, style: selectedStyle, sources: bibliographySources, legacy: legacyBibliography }))
      else sessionStorage.removeItem('gpg_bibliography')
    } catch { setBibliographyMessage('Browser storage is unavailable. Download your bibliography to keep a copy.') }
  }, [bibliographySources, legacyBibliography, storageReady, selectedStyle])

  // Preserve the spelling and capitalization of names entered or retrieved.
  const capitalizeNamePart = (name: string) => name

  const parseAuthor = (input: string): { surname: string; firstName: string; formatted: string } | null => {
    const trimmed = input.trim()
    if (!trimmed) return null

    let surname = ''
    let firstName = ''

    // Check if comma is present
    if (trimmed.includes(',')) {
      // Format: "Surname, First Name"
      const parts = trimmed.split(',').map(p => p.trim())
      surname = capitalizeNamePart(parts[0])
      firstName = parts[1] ? capitalizeNamePart(parts[1]) : ''
    } else {
      // Format: "First Name Surname" (space-separated)
      const words = trimmed.split(/\s+/).filter(w => w)
      if (words.length === 1) {
        // Single name - treat as surname only
        surname = capitalizeNamePart(words[0])
        firstName = ''
      } else {
        // Last word is surname, everything before is first name
        surname = capitalizeNamePart(words[words.length - 1])
        firstName = words.slice(0, -1).map(w => capitalizeNamePart(w)).join(' ')
      }
    }

    // Format for internal use: "Surname, FirstInitial."
    const initial = firstName ? firstName.charAt(0).toUpperCase() + '.' : ''
    const formatted = initial ? `${surname}, ${initial}` : surname

    return { surname, firstName, formatted }
  }

  const parseAuthors = (input: string): string[] => {
    if (!input.trim()) return []

    // Split by semicolon for multiple authors
    return input.split(';')
      .map(author => parseAuthor(author))
      .filter((parsed): parsed is NonNullable<typeof parsed> => parsed !== null)
      .map(parsed => {
        // Return full capitalized name in "Surname, FirstName" format for citation formatter
        return parsed.firstName ? `${parsed.surname}, ${parsed.firstName}` : parsed.surname
      })
  }

  const getAuthorPreview = (input: string) => parseAuthors(input).map(authorInitials).join('; ')

  const handleGenerate = () => {
    setFormError('')
    try {
      let source: CitationSource

      if (sourceType === 'book') {
        const authors = parseAuthors(bookAuthors)
        if (authors.length === 0 || !bookTitle) {
          setFormError('Please fill in authors and title.')
          return
        }

        source = {
          type: 'book',
          authors,
          title: bookTitle,
          year: bookYear,
          publisher: bookPublisher,
          place: bookPlace,
          edition: bookEdition || undefined,
          isbn: bookIsbn || undefined,
        } as BookSource
      } else if (sourceType === 'website') {
        const authors = webAuthors ? parseAuthors(webAuthors) : undefined
        if ((!authors || authors.length === 0) && !webOrganisation) {
          setFormError('Please provide an author or organisation.')
          return
        }
        if (!webTitle || !webUrl) {
          setFormError('Please fill in the title and URL.')
          return
        }

        source = {
          type: 'website',
          authors,
          organisation: webOrganisation || undefined,
          title: webTitle,
          year: webYear,
          url: webUrl,
          publicationDate: webPublicationDate || undefined,
          siteName: webSiteName || undefined,
          changesOverTime: webChangesOverTime,
          place: webPlace || undefined,
          dateAccessed: webDateAccessed || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        } as WebsiteSource
      } else {
        const authors = parseAuthors(journalAuthors)
        if (authors.length === 0 || !journalTitle || !journalName) {
          setFormError('Please fill in authors, article title, and journal name.')
          return
        }

        source = {
          type: 'journal',
          authors,
          title: journalTitle,
          journalName: journalName,
          year: journalYear,
          volume: journalVolume,
          issue: journalIssue || undefined,
          pageRange: journalPageRange,
          doi: journalDoi || undefined,
          articleNumber: journalArticleNumber || undefined,
          journalAbbreviation: journalAbbreviation || undefined,
        } as JournalSource
      }

      const validated = citationSourceSchema.safeParse(source)
      if (!validated.success) { setFormError(validated.error.issues[0]?.message || 'Check your source details.'); return }
      setGeneratedSource(validated.data)
    } catch (error) {
      console.error('Citation generation error:', error)
      setFormError('Failed to generate citation. Please check your input.')
    }
  }

  const handleAddToBibliography = () => {
    if (!generatedSource) return
    if (editingIdentity && bibliographySources.some(source => citationIdentity(source) === editingIdentity)) {
      setBibliographySources(previous => previous.flatMap(source => citationIdentity(source) === editingIdentity ? [generatedSource] : citationIdentity(source) === citationIdentity(generatedSource) ? [] : [source]))
      setEditingIdentity(null); setBibliographyMessage('Bibliography entry updated.'); return
    }
    if (bibliographySources.some(source => citationIdentity(source) === citationIdentity(generatedSource))) {
      setBibliographySources(prev => prev.map(source => citationIdentity(source) === citationIdentity(generatedSource) ? generatedSource : source))
      setBibliographyMessage('Bibliography entry updated.'); return
    }
    if (bibliographySources.length >= 200) { setBibliographyMessage('Download this bibliography before starting another (maximum 200 sources).'); return }
    setBibliographySources(prev => [...prev, generatedSource])
    setBibliographyMessage('Added to bibliography.')
  }
  const handleEditReference = (source: CitationSource) => {
    applyMetadata({ ...source, authors: source.authors || [] }, 'your saved bibliography')
    if (source.type === 'website') { setWebDateAccessed(source.dateAccessed); setWebPlace(source.place || ''); setWebChangesOverTime(!!source.changesOverTime) }
    if (source.type === 'journal') setJournalAbbreviation(source.journalAbbreviation || '')
    setEditingIdentity(citationIdentity(source)); setLookupMessage('Edit this source, generate the citation, then update the bibliography entry.')
    document.getElementById('reference-source-details')?.scrollIntoView({ block: 'start' })
  }
  const handleRemoveFromBibliography = (index: number) => {
    const identity = bibliography[index].source && citationIdentity(bibliography[index].source!)
    setBibliographySources(prev => prev.filter(source => citationIdentity(source) !== identity))
  }
  const handleDownloadBibliography = async () => {
    setExporting(true); setBibliographyMessage('')
    try {
      const response = await fetch('/api/resources/bibliography', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: selectedStyle, sources: bibliographySources }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Could not export the bibliography.') }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url; link.download = `bibliography-${selectedStyle.toLowerCase()}.docx`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      setBibliographyMessage('Your Word bibliography is ready.')
    } catch (error) { setBibliographyMessage(error instanceof Error ? error.message : 'Could not download the bibliography. Please try again.') }
    finally { setExporting(false) }
  }

  const stripMarkdown = (text: string): string => {
    // Remove markdown asterisks for italics
    return text.replace(/\*/g, '')
  }

  const handleCopyBibliography = async () => {
    if (bibliography.length === 0) {
      alert('Bibliography is empty')
      return
    }

    const text = bibliography.map(c => citationPlainText(c)).join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleCopyInText = async () => {
    if (!generatedCitation) return

    try {
      await navigator.clipboard.writeText(stripMarkdown(generatedCitation.inText))
      setCopiedInText(true)
      setTimeout(() => setCopiedInText(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleCopyFullRef = async () => {
    if (!generatedCitation) return

    try {
      await navigator.clipboard.writeText(citationPlainText(generatedCitation))
      setCopiedFullRef(true)
      setTimeout(() => setCopiedFullRef(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const clearForm = () => {
    setEditingIdentity(null)
    setLookupMessage('')
    setLookupError('')
    setBookAuthors('')
    setBookTitle('')
    setBookYear('')
    setBookPublisher('')
    setBookPlace(''); setBookEdition(''); setBookIsbn('')
    setWebAuthors('')
    setWebOrganisation('')
    setWebTitle('')
    setWebYear('')
    setWebUrl('')
    setWebDateAccessed(''); setWebPublicationDate(''); setWebSiteName(''); setWebChangesOverTime(false); setWebPlace('')
    setJournalAuthors('')
    setJournalTitle('')
    setJournalName('')
    setJournalYear('')
    setJournalVolume('')
    setJournalIssue('')
    setJournalPageRange('')
    setJournalDoi(''); setJournalArticleNumber(''); setJournalAbbreviation('')
    setGeneratedSource(null); setFormError('')
  }

  return (
    <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
      <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
        <div className="container-narrow py-8 sm:py-10">
          <h1 className="page-heading text-3xl sm:text-4xl text-[#1B2E4B] mb-3">
            Reference Generator
          </h1>
          <p className="text-base text-[#475569] max-w-2xl">
            Generate correctly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles.
          </p>
        </div>
      </section>

      <div className="container-narrow py-8 space-y-6">
        <div className="ui-card p-6 space-y-3">
          <h2 className="block text-lg font-semibold text-[#1B2E4B]">Find reference details automatically</h2>
          <div className="flex flex-wrap gap-2">
            <button disabled={lookupLoading} onClick={() => setLookupMode('identifier')} aria-pressed={lookupMode === 'identifier'} className="ui-choice">DOI, ISBN or link</button>
            <button disabled={lookupLoading} onClick={() => setLookupMode('book')} aria-pressed={lookupMode === 'book'} className="ui-choice">Search by book title</button>
          </div>
          {lookupMode === 'identifier' ? <form onSubmit={event => { event.preventDefault(); void retrieveReference(lookupInput.trim()) }} className="space-y-3">
          <label htmlFor="reference-lookup" className="sr-only">DOI, ISBN or webpage URL</label>
          <p className="text-sm text-[#6B7280]">Paste a DOI, ISBN-10, ISBN-13, or public webpage link.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="reference-lookup" value={lookupInput} onChange={event => setLookupInput(event.target.value)} placeholder="DOI, ISBN, or https://…" required maxLength={2000} disabled={lookupLoading} className="ui-input flex-1" />
            <button disabled={lookupLoading || !lookupInput.trim()} className="ui-button-primary">{lookupLoading ? 'Finding details…' : 'Find reference'}</button>
          </div>
          <p className="text-xs text-[#6B7280]">Some websites block automatic access or omit citation details. You can always complete the form manually.</p>
          </form> : <BookTitleSearch onSelect={applyMetadata} onBusyChange={setLookupLoading} />}
          {lookupLoading && lookupMode === 'identifier' && <p role="status" className="text-sm text-[#6B7280]">Retrieving source details…</p>}
          {lookupError && <p role="alert" className="text-sm text-red-700">{lookupError}</p>}
          {lookupMessage && <p role="status" className="text-sm text-green-700">{lookupMessage}</p>}
        </div>

        {/* Style Selection */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-3">Citation style</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(style => (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                aria-pressed={selectedStyle === style.value}
                className="ui-choice"
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#6B7280]">APA 7; Harvard Cite Them Right; Vancouver ICMJE; MLA 9; Chicago 18 author–date. Check title capitalization, missing details, and any page locator against your source and university guidance.</p>
        {bibliographyMessage && <p role="status" className="text-sm text-[#1B2E4B]">{bibliographyMessage}</p>}
        {/* Source type Selection */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-3">Source type</label>
          <div className="grid grid-cols-3 gap-3">
            {SOURCE_TYPES.map(type => (
              <button
                key={type.value}
                disabled={lookupLoading}
                onClick={() => {
                  setSourceType(type.value)
                  clearForm()
                }}
                aria-pressed={sourceType === type.value}
                className="ui-choice flex flex-col sm:flex-row items-center justify-center gap-2"
              >
                <AcademicIcon name={type.icon} className="w-5 h-5 shrink-0" />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="reference-source-details" className="scroll-mt-24 text-lg font-semibold text-[#1B2E4B]">Enter source details</h2>
            <button
              onClick={clearForm}
              disabled={lookupLoading}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#14233B] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear form
            </button>
          </div>

          <fieldset disabled={lookupLoading}>
          {sourceType === 'book' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Authors <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookAuthors}
                  onChange={(e) => setBookAuthors(e.target.value)}
                  placeholder="Smith, John; Jones, Amara"
                  className="ui-input"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Recommended: Surname, Full First Name — separate multiple authors with semicolons (;)
                </p>
                {bookAuthors.trim() && (
                  <div className="mt-2 px-3 py-2 bg-[#F5F0E8] rounded-lg border border-[#E8E2D9]">
                    <p className="text-xs font-semibold text-[#1B2E4B] mb-1">Preview:</p>
                    <p className="text-sm text-[#6B7280]">{getAuthorPreview(bookAuthors)}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Book title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Machine Learning Fundamentals"
                  className="ui-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year (blank if undated)
                  </label>
                  <input
                    type="text"
                    value={bookYear}
                    onChange={(e) => setBookYear(e.target.value)}
                    placeholder="2024"
                    className="ui-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Place of publication (Vancouver)</label>
                  <input
                    type="text"
                    value={bookPlace}
                    onChange={(e) => setBookPlace(e.target.value)}
                    placeholder="London"
                    className="ui-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Publisher</label>
                <input
                  type="text"
                  value={bookPublisher}
                  onChange={(e) => setBookPublisher(e.target.value)}
                  placeholder="Academic Press"
                  className="ui-input"
                />
              </div>
              <label className="block text-sm font-semibold text-[#1B2E4B]">Edition (if later than first)
                <input value={bookEdition} onChange={e => setBookEdition(e.target.value)} placeholder="e.g., 2nd" className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" />
              </label>
            </div>
          )}

          {sourceType === 'website' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Authors (optional if organisation provided)
                </label>
                <input
                  type="text"
                  value={webAuthors}
                  onChange={(e) => setWebAuthors(e.target.value)}
                  placeholder="Brown, Thomas; Smith, Jane"
                  className="ui-input"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Recommended: Surname, Full First Name — separate multiple authors with semicolons (;)
                </p>
                {webAuthors.trim() && (
                  <div className="mt-2 px-3 py-2 bg-[#F5F0E8] rounded-lg border border-[#E8E2D9]">
                    <p className="text-xs font-semibold text-[#1B2E4B] mb-1">Preview:</p>
                    <p className="text-sm text-[#6B7280]">{getAuthorPreview(webAuthors)}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Organisation
                </label>
                <input
                  type="text"
                  value={webOrganisation}
                  onChange={(e) => setWebOrganisation(e.target.value)}
                  placeholder="OpenAI"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Page/Article title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="Introduction to Neural Networks"
                  className="ui-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year (blank if undated)
                  </label>
                  <input
                    type="text"
                    value={webYear}
                    onChange={(e) => { setWebYear(e.target.value); setWebPublicationDate('') }}
                    placeholder="2023"
                    className="ui-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Date accessed</label>
                  <input
                    type="text"
                    value={webDateAccessed}
                    onChange={(e) => setWebDateAccessed(e.target.value)}
                    placeholder="15 September 2024"
                    className="ui-input"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Format: DD Month YYYY</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="ui-input"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-[#1B2E4B]">Publication date (if known)<input type="date" value={webPublicationDate} onChange={e => { setWebPublicationDate(e.target.value); if (e.target.value) setWebYear(e.target.value.slice(0, 4)) }} className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" /></label>
                <label className="text-sm font-semibold text-[#1B2E4B]">Website name (if different from author)<input value={webSiteName} onChange={e => setWebSiteName(e.target.value)} className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" /></label>
              </div>
              {selectedStyle === 'Vancouver' && <label className="block text-sm font-semibold text-[#1B2E4B]">Publisher location (if known)<input value={webPlace} onChange={e => setWebPlace(e.target.value)} className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" /></label>}
              <label className="flex gap-2 items-center text-sm text-[#6B7280]"><input type="checkbox" checked={webChangesOverTime} onChange={e => setWebChangesOverTime(e.target.checked)} />Content changes over time (include an APA retrieval date)</label>
            </div>
          )}

          {sourceType === 'journal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Authors <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={journalAuthors}
                  onChange={(e) => setJournalAuthors(e.target.value)}
                  placeholder="Wilson, Karen; Davis, Michael; Taylor, Rebecca"
                  className="ui-input"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Recommended: Surname, Full First Name — separate multiple authors with semicolons (;)
                </p>
                {journalAuthors.trim() && (
                  <div className="mt-2 px-3 py-2 bg-[#F5F0E8] rounded-lg border border-[#E8E2D9]">
                    <p className="text-xs font-semibold text-[#1B2E4B] mb-1">Preview:</p>
                    <p className="text-sm text-[#6B7280]">{getAuthorPreview(journalAuthors)}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Article title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  placeholder="Advances in Deep Learning"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Journal name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={journalName}
                  onChange={(e) => setJournalName(e.target.value)}
                  placeholder="Journal of AI Research"
                  className="ui-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year (blank if undated)
                  </label>
                  <input
                    type="text"
                    value={journalYear}
                    onChange={(e) => setJournalYear(e.target.value)}
                    placeholder="2024"
                    className="ui-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Volume (if available)
                  </label>
                  <input
                    type="text"
                    value={journalVolume}
                    onChange={(e) => setJournalVolume(e.target.value)}
                    placeholder="45"
                    className="ui-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Issue</label>
                  <input
                    type="text"
                    value={journalIssue}
                    onChange={(e) => setJournalIssue(e.target.value)}
                    placeholder="3"
                    className="ui-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Page range (if available)
                  </label>
                  <input
                    type="text"
                    value={journalPageRange}
                    onChange={(e) => setJournalPageRange(e.target.value)}
                    placeholder="123-145"
                    className="ui-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">DOI (optional)</label>
                <input
                  type="text"
                  value={journalDoi}
                  onChange={(e) => setJournalDoi(e.target.value)}
                  placeholder="10.1234/jair.2024.123"
                  className="ui-input"
                />
              </div>
              <label className="block text-sm font-semibold text-[#1B2E4B]">Article number (if used instead of pages)<input value={journalArticleNumber} onChange={e => setJournalArticleNumber(e.target.value)} placeholder="e.g., e0123456" className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" /></label>
              {selectedStyle === 'Vancouver' && <label className="block text-sm font-semibold text-[#1B2E4B]">Verified journal abbreviation (optional)<input value={journalAbbreviation} onChange={e => setJournalAbbreviation(e.target.value)} placeholder="e.g., N Engl J Med" className="w-full mt-2 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm" /><span className="block mt-1 text-xs font-normal text-[#6B7280]">Use the journal’s official NLM abbreviation; otherwise its full name is retained.</span></label>}
            </div>
          )}

          {formError && <p role="alert" className="text-sm text-red-700 mt-4">{formError}</p>}
          <button
            disabled={lookupLoading}
            onClick={handleGenerate}
            className="ui-button-primary w-full mt-6"
          >
            Generate citation
          </button>
          </fieldset>
        </div>

        {/* Generated Output */}
        {generatedCitation && (
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-[#1B2E4B] mb-4">Generated citation</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    In-text citation
                  </label>
                  <button
                    onClick={handleCopyInText}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      copiedInText
                        ? 'bg-[#16A34A] text-white'
                        : 'text-[#6B7280] hover:text-[#14233B]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {copiedInText ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      )}
                    </svg>
                    {copiedInText ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-[#F5F0E8] rounded-xl p-4">
                  <p className="text-sm text-[#1B2E4B] font-mono">{generatedCitation.inText}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    Full reference
                  </label>
                  <button
                    onClick={handleCopyFullRef}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      copiedFullRef
                        ? 'bg-[#16A34A] text-white'
                        : 'text-[#6B7280] hover:text-[#14233B]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {copiedFullRef ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      )}
                    </svg>
                    {copiedFullRef ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-[#F5F0E8] rounded-xl p-4">
                  <p className="text-sm text-[#1B2E4B] break-words"><CitationText citation={generatedCitation} /></p>
                </div>
              </div>

              <button
                onClick={handleAddToBibliography}
                className="ui-button-primary w-full"
              >
                {editingIdentity || generatedSource && bibliographySources.some(source => citationIdentity(source) === citationIdentity(generatedSource)) ? 'Update bibliography entry' : 'Add to bibliography'}
              </button>
            </div>
          </div>
        )}

        {/* Bibliography */}
        <AccountBibliography sources={bibliographySources} style={selectedStyle} ready={storageReady} onLoad={(sources, style) => { setBibliographySources(sources); setSelectedStyle(style); setGeneratedSource(null); setLegacyBibliography([]); setEditingIdentity(null) }} />

        {bibliography.length > 0 && (
          <div className="ui-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-[#1B2E4B]">
                Bibliography ({bibliography.length})
              </h2>
              <div className="flex flex-wrap gap-2">
              <button onClick={() => void handleDownloadBibliography()} disabled={exporting} className="ui-button-primary">{exporting ? 'Preparing Word…' : 'Download Word (.docx)'}</button>
              <button
                onClick={handleCopyBibliography}
                className="ui-button-secondary"
              >
                {copySuccess ? '✓ Copied!' : 'Copy all'}
              </button>
              </div>
            </div>

            {selectedStyle === 'Vancouver' && <p className="text-xs text-[#6B7280] mb-3">Numbers follow the order you add sources. If you remove or reorder entries, update any in-text numbers already copied into your document.</p>}
            <div className="space-y-3">
              {bibliography.map((citation, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-[#F5F0E8] rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1B2E4B] break-words"><CitationText citation={citation} /></p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3">
                    {citation.source && <button className="text-sm ui-link" onClick={() => handleEditReference(citation.source!)}>Edit</button>}
                    <button
                      onClick={() => handleRemoveFromBibliography(index)}
                      className="shrink-0 text-[#EF4444] hover:text-[#DC2626] font-bold text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {legacyBibliography.length > 0 && <div className="ui-card p-6 space-y-3">
          <h2 className="font-semibold text-[#1B2E4B]">Earlier references (original formatting)</h2>
          <p className="text-sm text-[#6B7280]">These older entries have no saved source details. They remain here for copying; add them again to include them in a corrected Word export.</p>
          {legacyBibliography.map((citation, index) => <div key={index} className="bg-[#F5F0E8] rounded-xl p-4 space-y-2"><p className="text-xs text-[#6B7280]">{citation.style}</p><p className="text-sm text-[#1B2E4B] break-words">{citationPlainText(citation)}</p><button onClick={() => setLegacyBibliography(prev => prev.filter((_, i) => i !== index))} className="text-sm font-semibold text-red-700">Remove earlier reference</button></div>)}
        </div>}
      </div>
    </main>
  )
}

function CitationText({ citation }: { citation: FormattedCitation }) {
  return citation.runs ? <>{citation.runs.map((run, index) => run.italic ? <em key={index}>{run.text}</em> : <span key={index}>{run.text}</span>)}</> : <>{citationPlainText(citation)}</>
}
