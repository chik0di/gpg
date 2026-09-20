'use client'

import { useState, useEffect } from 'react'

interface ResearchResult {
  title: string
  authors: string
  year: number | null
  source: string
  hasFreeAccess: boolean
  url: string | null
}

interface QuotaInfo {
  used: number
  remaining: number
  limit: number
  resetAt: number | null
}

export default function ResearchFinderClient() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [quota, setQuota] = useState<QuotaInfo>({ used: 0, remaining: 20, limit: 20, resetAt: null })
  const [loadingQuota, setLoadingQuota] = useState(true)

  // Fetch quota on mount and after each search
  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/resources/research')
      if (response.ok) {
        const data = await response.json()
        setQuota(data)
      }
    } catch (err) {
      console.error('[Research Finder Client] Failed to fetch quota:', err)
    } finally {
      setLoadingQuota(false)
    }
  }

  useEffect(() => {
    fetchQuota()
  }, [])

  const handleSearch = async () => {
    if (!topic.trim()) {
      alert('Please enter a research topic')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    console.log('========================================')
    console.log('[Research Finder Client] 🔍 INITIATING SEARCH')
    console.log('[Research Finder Client] Topic (raw):', topic)
    console.log('[Research Finder Client] Topic (trimmed):', topic.trim())
    console.log('[Research Finder Client] Calling API: /api/resources/research')
    console.log('========================================')

    try {
      const requestBody = { topic: topic.trim() }
      console.log('[Research Finder Client] Request body:', requestBody)

      const response = await fetch('/api/resources/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('========================================')
      console.log('[Research Finder Client] 📡 API RESPONSE')
      console.log('[Research Finder Client] Status:', response.status)
      console.log('[Research Finder Client] OK:', response.ok)
      console.log('[Research Finder Client] Headers:', Object.fromEntries(response.headers.entries()))
      console.log('========================================')

      const data = await response.json()

      console.log('========================================')
      console.log('[Research Finder Client] 📊 RESPONSE DATA')
      console.log('[Research Finder Client] Data:', data)
      console.log('[Research Finder Client] Results:', data.results)
      console.log('[Research Finder Client] Results length:', data.results?.length ?? 0)
      console.log('========================================')

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.results || [])
      console.log('[Research Finder Client] ✅ Results set in state:', data.results?.length ?? 0)

      // Update quota after successful search
      await fetchQuota()
    } catch (err) {
      console.error('========================================')
      console.error('[Research Finder Client] ❌ ERROR')
      console.error('[Research Finder Client] Error:', err)
      console.error('========================================')
      setError(err instanceof Error ? err.message : 'Failed to search. Please try again.')
      setResults([])

      // Still update quota even on error (might be a rate limit error)
      await fetchQuota()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch()
    }
  }

  return (
    <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
      <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
        <div className="container-narrow py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
            Research Material Finder
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Find relevant academic sources for your topic instantly.
          </p>
        </div>
      </section>

      <div className="container-narrow py-12 space-y-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-[#1B2E4B]">
              Enter your research topic
            </label>
            {!loadingQuota && (
              <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
                quota.remaining === 0
                  ? 'bg-red-100 text-red-700'
                  : quota.remaining <= 2
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#F5F0E8] text-[#6B7280]'
              }`}>
                {quota.used} / {quota.limit} searches used
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., machine learning in healthcare"
              className="flex-1 px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30"
              disabled={loading || quota.remaining === 0}
            />
            <button
              onClick={handleSearch}
              disabled={loading || quota.remaining === 0}
              className="px-6 py-3 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[#9CA3AF]">
              {quota.remaining === 0 && quota.resetAt
                ? `Limit reached. Resets ${new Date(quota.resetAt).toLocaleTimeString()}`
                : quota.remaining <= 2 && quota.remaining > 0
                ? `${quota.remaining} search${quota.remaining > 1 ? 'es' : ''} remaining this hour`
                : 'Limited to 20 searches per hour, min. 3 seconds apart'}
            </p>
            {quota.resetAt && quota.remaining === 0 && (
              <button
                onClick={fetchQuota}
                className="text-xs text-[#E8A020] hover:text-[#C4861A] font-semibold"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {/* Results */}
        {searched && !loading && !error && (
          <>
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8E2D9] p-8 text-center" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
                <p className="text-[#6B7280]">No results found for &quot;{topic}&quot;. Try a different search term.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#1B2E4B]">
                    Found {results.length} {results.length === 1 ? 'result' : 'results'}
                  </h2>
                </div>

                {results.map((result, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-[#E8E2D9] p-5"
                    style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-base font-bold text-[#1B2E4B] leading-snug">
                          {result.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6B7280]">
                          <span>{result.authors}</span>
                          {result.year && (
                            <>
                              <span className="text-[#E8E2D9]">•</span>
                              <span>{result.year}</span>
                            </>
                          )}
                          <span className="text-[#E8E2D9]">•</span>
                          <span className="text-xs">{result.source}</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {result.hasFreeAccess && result.url ? (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold rounded-xl transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Free PDF
                          </a>
                        ) : result.url ? (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E8A020] hover:bg-[#C4861A] text-white text-sm font-bold rounded-xl transition-colors"
                          >
                            View Source
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-500 text-sm font-semibold rounded-xl">
                            No link available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        {!searched && (
          <div className="bg-[#FDFAF6] border border-[#E8E2D9] rounded-xl p-6">
            <h3 className="text-sm font-bold text-[#1B2E4B] mb-3">How it works</h3>
            <ul className="space-y-2 text-sm text-[#6B7280]">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-[#E8A020] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Enter your research topic or keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-[#E8A020] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>We search multiple academic databases (Semantic Scholar, OpenAlex) for relevant papers</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-[#E8A020] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Get instant access to sources with free PDFs highlighted</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
