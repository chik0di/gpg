'use client'

import { useState, useEffect } from 'react'
import {
  formatCitation,
  sortCitations,
  resetVancouverCounter,
  type CitationStyle,
  type SourceType,
  type CitationSource,
  type FormattedCitation,
  type BookSource,
  type WebsiteSource,
  type JournalSource,
} from '@/lib/citation-formatter'

const STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'APA', label: 'APA 7th' },
  { value: 'Harvard', label: 'Harvard' },
  { value: 'Vancouver', label: 'Vancouver' },
  { value: 'MLA', label: 'MLA 9th' },
  { value: 'Chicago', label: 'Chicago' },
]

const SOURCE_TYPES: { value: SourceType; label: string; icon: string }[] = [
  { value: 'book', label: 'Book', icon: '📚' },
  { value: 'website', label: 'Website', icon: '🌐' },
  { value: 'journal', label: 'Journal Article', icon: '📄' },
]

export default function ReferenceGeneratorClient() {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('APA')
  const [sourceType, setSourceType] = useState<SourceType>('book')
  const [generatedCitation, setGeneratedCitation] = useState<FormattedCitation | null>(null)
  const [bibliography, setBibliography] = useState<FormattedCitation[]>([])
  const [copySuccess, setCopySuccess] = useState(false)
  const [copiedInText, setCopiedInText] = useState(false)
  const [copiedFullRef, setCopiedFullRef] = useState(false)

  // Book form state
  const [bookAuthors, setBookAuthors] = useState('')
  const [bookTitle, setBookTitle] = useState('')
  const [bookYear, setBookYear] = useState('')
  const [bookPublisher, setBookPublisher] = useState('')
  const [bookPlace, setBookPlace] = useState('')

  // Website form state
  const [webAuthors, setWebAuthors] = useState('')
  const [webOrganisation, setWebOrganisation] = useState('')
  const [webTitle, setWebTitle] = useState('')
  const [webYear, setWebYear] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [webDateAccessed, setWebDateAccessed] = useState('')

  // Journal form state
  const [journalAuthors, setJournalAuthors] = useState('')
  const [journalTitle, setJournalTitle] = useState('')
  const [journalName, setJournalName] = useState('')
  const [journalYear, setJournalYear] = useState('')
  const [journalVolume, setJournalVolume] = useState('')
  const [journalIssue, setJournalIssue] = useState('')
  const [journalPageRange, setJournalPageRange] = useState('')
  const [journalDoi, setJournalDoi] = useState('')

  // Load bibliography from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('gpg_bibliography')
    if (saved) {
      try {
        setBibliography(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load bibliography:', e)
      }
    }
  }, [])

  // Save bibliography to sessionStorage whenever it changes
  useEffect(() => {
    if (bibliography.length > 0) {
      sessionStorage.setItem('gpg_bibliography', JSON.stringify(bibliography))
    } else {
      sessionStorage.removeItem('gpg_bibliography')
    }
  }, [bibliography])

  const capitalizeNamePart = (name: string): string => {
    if (!name) return name

    // Handle hyphenated names (Smith-Jones), apostrophes (O'Brien), and spaces
    return name
      .split(/([-' ])/) // Split on hyphens, apostrophes, and spaces, keeping delimiters
      .map(part => {
        if (part === '-' || part === "'" || part === ' ') return part
        if (!part) return part

        // Capitalize first letter, lowercase rest
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      })
      .join('')
  }

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

  const getAuthorPreview = (input: string): string => {
    if (!input.trim()) return ''

    const parsed = input.split(';')
      .map(author => parseAuthor(author))
      .filter((parsed): parsed is NonNullable<typeof parsed> => parsed !== null)

    if (parsed.length === 0) return ''

    // Show how it will appear in citation (APA/Harvard style with "and" or "et al.")
    if (parsed.length === 1) {
      return parsed[0].surname + (parsed[0].firstName ? `, ${parsed[0].firstName.charAt(0).toUpperCase()}.` : '')
    } else if (parsed.length === 2) {
      const first = parsed[0].surname + (parsed[0].firstName ? `, ${parsed[0].firstName.charAt(0).toUpperCase()}.` : '')
      const second = parsed[1].surname + (parsed[1].firstName ? `, ${parsed[1].firstName.charAt(0).toUpperCase()}.` : '')
      return `${first} and ${second}`
    } else {
      const first = parsed[0].surname + (parsed[0].firstName ? `, ${parsed[0].firstName.charAt(0).toUpperCase()}.` : '')
      return `${first} et al.`
    }
  }

  const handleGenerate = () => {
    try {
      let source: CitationSource

      if (sourceType === 'book') {
        const authors = parseAuthors(bookAuthors)
        if (authors.length === 0 || !bookTitle || !bookYear) {
          alert('Please fill in at least authors, title, and year')
          return
        }

        source = {
          type: 'book',
          authors,
          title: bookTitle,
          year: bookYear,
          publisher: bookPublisher || 'Unknown Publisher',
          place: bookPlace || 'Unknown',
        } as BookSource
      } else if (sourceType === 'website') {
        const authors = webAuthors ? parseAuthors(webAuthors) : undefined
        if ((!authors || authors.length === 0) && !webOrganisation) {
          alert('Please provide either authors or organisation name')
          return
        }
        if (!webTitle || !webYear || !webUrl) {
          alert('Please fill in title, year, and URL')
          return
        }

        source = {
          type: 'website',
          authors,
          organisation: webOrganisation || undefined,
          title: webTitle,
          year: webYear,
          url: webUrl,
          dateAccessed: webDateAccessed || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        } as WebsiteSource
      } else {
        const authors = parseAuthors(journalAuthors)
        if (authors.length === 0 || !journalTitle || !journalName || !journalYear || !journalVolume || !journalPageRange) {
          alert('Please fill in authors, article title, journal name, year, volume, and page range')
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
        } as JournalSource
      }

      if (selectedStyle === 'Vancouver') {
        resetVancouverCounter()
        const vancouverBib = bibliography.filter(c => c.style === 'Vancouver')
        vancouverBib.forEach((_, idx) => {
          vancouverBib[idx] = formatCitation(
            source,
            'Vancouver'
          )
        })
      }

      const citation = formatCitation(source, selectedStyle)
      setGeneratedCitation(citation)
    } catch (error) {
      console.error('Citation generation error:', error)
      alert('Failed to generate citation. Please check your input.')
    }
  }

  const handleAddToBibliography = () => {
    if (!generatedCitation) return

    setBibliography(prev => {
      const updated = [...prev, generatedCitation]
      return sortCitations(updated)
    })

    alert('Added to bibliography!')
  }

  const handleRemoveFromBibliography = (index: number) => {
    setBibliography(prev => prev.filter((_, i) => i !== index))
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

    const text = bibliography.map(c => stripMarkdown(c.fullReference)).join('\n\n')

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
      await navigator.clipboard.writeText(stripMarkdown(generatedCitation.fullReference))
      setCopiedFullRef(true)
      setTimeout(() => setCopiedFullRef(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const clearForm = () => {
    setBookAuthors('')
    setBookTitle('')
    setBookYear('')
    setBookPublisher('')
    setBookPlace('')
    setWebAuthors('')
    setWebOrganisation('')
    setWebTitle('')
    setWebYear('')
    setWebUrl('')
    setWebDateAccessed('')
    setJournalAuthors('')
    setJournalTitle('')
    setJournalName('')
    setJournalYear('')
    setJournalVolume('')
    setJournalIssue('')
    setJournalPageRange('')
    setJournalDoi('')
    setGeneratedCitation(null)
  }

  return (
    <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
      <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
        <div className="container-narrow py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
            Reference Generator
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Generate correctly formatted citations in APA, Harvard, Vancouver, MLA and Chicago styles.
          </p>
        </div>
      </section>

      <div className="container-narrow py-12 space-y-8">
        {/* Style Selection */}
        <div>
          <label className="block text-sm font-bold text-[#1B2E4B] mb-3">Citation Style</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(style => (
              <button
                key={style.value}
                onClick={() => setSelectedStyle(style.value)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  selectedStyle === style.value
                    ? 'bg-[#E8A020] text-white shadow-md'
                    : 'bg-white text-[#6B7280] border border-[#E8E2D9] hover:border-[#E8A020]'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source Type Selection */}
        <div>
          <label className="block text-sm font-bold text-[#1B2E4B] mb-3">Source Type</label>
          <div className="grid grid-cols-3 gap-3">
            {SOURCE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  setSourceType(type.value)
                  clearForm()
                }}
                className={`p-4 rounded-xl font-semibold text-sm transition-all ${
                  sourceType === type.value
                    ? 'bg-[#E8A020] text-white shadow-md'
                    : 'bg-white text-[#6B7280] border border-[#E8E2D9] hover:border-[#E8A020]'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1B2E4B]">Enter Source Details</h2>
            <button
              onClick={clearForm}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#E8A020] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Form
            </button>
          </div>

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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
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
                  Book Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Machine Learning Fundamentals"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookYear}
                    onChange={(e) => setBookYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Place of Publication</label>
                  <input
                    type="text"
                    value={bookPlace}
                    onChange={(e) => setBookPlace(e.target.value)}
                    placeholder="London"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Page/Article Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="Introduction to Neural Networks"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={webYear}
                    onChange={(e) => setWebYear(e.target.value)}
                    placeholder="2023"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">Date Accessed</label>
                  <input
                    type="text"
                    value={webDateAccessed}
                    onChange={(e) => setWebDateAccessed(e.target.value)}
                    placeholder="15 September 2024"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">Format: DD Month YYYY</p>
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
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
                  Article Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  placeholder="Advances in Deep Learning"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                  Journal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={journalName}
                  onChange={(e) => setJournalName(e.target.value)}
                  placeholder="Journal of AI Research"
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={journalYear}
                    onChange={(e) => setJournalYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Volume <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={journalVolume}
                    onChange={(e) => setJournalVolume(e.target.value)}
                    placeholder="45"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
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
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1B2E4B] mb-2">
                    Page Range <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={journalPageRange}
                    onChange={(e) => setJournalPageRange(e.target.value)}
                    placeholder="123-145"
                    className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
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
                  className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full mt-6 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold py-3 rounded-xl transition-colors"
          >
            Generate Citation
          </button>
        </div>

        {/* Generated Output */}
        {generatedCitation && (
          <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
            <h2 className="text-lg font-bold text-[#1B2E4B] mb-4">Generated Citation</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">
                    In-text Citation
                  </label>
                  <button
                    onClick={handleCopyInText}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      copiedInText
                        ? 'bg-[#16A34A] text-white'
                        : 'text-[#6B7280] hover:text-[#E8A020]'
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
                  <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">
                    Full Reference
                  </label>
                  <button
                    onClick={handleCopyFullRef}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      copiedFullRef
                        ? 'bg-[#16A34A] text-white'
                        : 'text-[#6B7280] hover:text-[#E8A020]'
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
                  <p className="text-sm text-[#1B2E4B]" dangerouslySetInnerHTML={{ __html: generatedCitation.fullReference.replace(/\*/g, '') }} />
                </div>
              </div>

              <button
                onClick={handleAddToBibliography}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-3 rounded-xl transition-colors"
              >
                + Add to Bibliography
              </button>
            </div>
          </div>
        )}

        {/* Bibliography */}
        {bibliography.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1B2E4B]">
                Bibliography ({bibliography.length})
              </h2>
              <button
                onClick={handleCopyBibliography}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  copySuccess
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-[#E8A020] hover:bg-[#C4861A] text-white'
                }`}
              >
                {copySuccess ? '✓ Copied!' : 'Copy All'}
              </button>
            </div>

            <div className="space-y-3">
              {bibliography.map((citation, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-[#F5F0E8] rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm text-[#1B2E4B]" dangerouslySetInnerHTML={{ __html: citation.fullReference.replace(/\*/g, '') }} />
                  </div>
                  <button
                    onClick={() => handleRemoveFromBibliography(index)}
                    className="shrink-0 text-[#EF4444] hover:text-[#DC2626] font-bold text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
