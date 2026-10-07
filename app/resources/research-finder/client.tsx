'use client'

import { useState, useEffect } from 'react'
import type { ResearchSource } from '@/lib/research-materials'

export default function ResearchFinderClient() {
  const [topic, setTopic] = useState('')
  const [submittedTopic, setSubmittedTopic] = useState('')
  const [fromYear, setFromYear] = useState('')
  const [toYear, setToYear] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResearchSource[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number; resetAt: number | null } | null>(null)

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/resources/research')
      if (response.ok) setQuota(await response.json())
    } catch { /* Search remains available if the quota display cannot load. */ }
  }
  useEffect(() => { void fetchQuota() }, [])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(false), 3000)
    return () => clearTimeout(timer)
  }, [cooldown])
  useEffect(() => {
    if (!quota?.resetAt || quota.remaining > 0) return
    const timer = setTimeout(() => { void fetchQuota() }, Math.max(1000, quota.resetAt - Date.now() + 1000))
    return () => clearTimeout(timer)
  }, [quota])

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading || cooldown || quota?.remaining === 0) return
    if (!topic.trim() || (fromYear && toYear && Number(fromYear) > Number(toYear))) {
      setError('Enter a topic and a valid publication year range.'); return
    }
    setLoading(true); setCooldown(true); setError(''); setWarnings([]); setSearched(true); setSubmittedTopic(topic.trim())
    try {
      const response = await fetch('/api/resources/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), fromYear: fromYear ? Number(fromYear) : undefined, toYear: toYear ? Number(toYear) : undefined, freeOnly }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Search failed. Please try again.')
      setResults(data.results || []); setWarnings(data.warnings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.'); setResults([])
    } finally { setLoading(false); void fetchQuota() }
  }

  const inputClass = 'min-w-0 w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30'
  return (
    <main className="min-h-screen bg-[#F5F0E8]">
      <section className="border-b border-[#E8E2D9] bg-[#FDFAF6]">
        <div className="container-narrow py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">Research Material Finder</h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">Explore academic papers, find free reading options, and cite your sources.</p>
        </div>
      </section>
      <div className="container-narrow py-12 space-y-6">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-[#E8E2D9] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="research-topic" className="text-sm font-bold text-[#1B2E4B]">Enter your research topic</label>
            {quota && <span className="text-xs text-[#6B7280]">{quota.used} / {quota.limit} searches used</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="research-topic" value={topic} maxLength={200} onChange={e => setTopic(e.target.value)} placeholder="e.g., machine learning in healthcare" className={inputClass} required disabled={loading} />
            <button disabled={loading || cooldown || quota?.remaining === 0} className="px-6 py-3 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Searching…' : cooldown ? 'Please wait…' : 'Search'}</button>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm text-[#6B7280]">From year<input type="number" min={1500} max={new Date().getFullYear() + 1} value={fromYear} onChange={e => setFromYear(e.target.value)} className={`${inputClass} mt-1 max-w-32`} disabled={loading} placeholder="Any" /></label>
            <label className="text-sm text-[#6B7280]">To year<input type="number" min={1500} max={new Date().getFullYear() + 1} value={toYear} onChange={e => setToYear(e.target.value)} className={`${inputClass} mt-1 max-w-32`} disabled={loading} placeholder="Any" /></label>
            <label className="flex items-center gap-2 py-3 text-sm text-[#1B2E4B]"><input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} disabled={loading} className="accent-[#E8A020]" />Free full text only</label>
          </div>
          <p className="text-xs text-[#6B7280]">{quota?.remaining === 0 && quota.resetAt ? `Search limit reached. Resets at ${new Date(quota.resetAt).toLocaleTimeString()}.` : '20 searches per hour. Results come from Semantic Scholar, OpenAlex, and Crossref.'}</p>
        </form>
        <div aria-live="polite">
          {error && <p role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</p>}
          {loading && <div role="status" className="space-y-4"><p className="text-sm text-[#6B7280]">Searching academic databases…</p>{[0, 1, 2].map(i => <div key={i} className="animate-pulse bg-white border border-[#E8E2D9] rounded-2xl p-6 space-y-3"><div className="h-4 w-3/4 bg-[#E8E2D9] rounded" /><div className="h-3 w-1/2 bg-[#F5F0E8] rounded" /><div className="h-12 bg-[#F5F0E8] rounded" /></div>)}</div>}
          {!loading && warnings.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-4">{warnings.map(w => <p key={w}>{w}</p>)}</div>}
          {searched && !loading && !error && <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1B2E4B]">{results.length} {results.length === 1 ? 'result' : 'results'} for “{submittedTopic}”</h2>
            {!results.length && <p className="bg-white rounded-2xl border border-[#E8E2D9] p-8 text-[#6B7280]">No matching results in the databases searched. Try broader keywords or a wider year range.</p>}
            {results.map((result, i) => <article key={`${result.doi || result.url}-${i}`} className="bg-white rounded-2xl border border-[#E8E2D9] p-5 space-y-3">
              <h3 className="text-base font-bold text-[#1B2E4B]">{result.title}</h3>
              <p className="text-sm text-[#6B7280]">{result.authors}{result.year ? ` · ${result.year}` : ''}</p>
              {result.journal && <p className="text-sm text-[#1B2E4B]">{result.journal}</p>}
              {result.abstract ? <details className="text-sm text-[#6B7280]"><summary className="cursor-pointer font-semibold text-[#1B2E4B]">Abstract preview</summary><p className="mt-2 leading-relaxed">{result.abstract.slice(0, 1200)}{result.abstract.length > 1200 ? '…' : ''}</p></details> : <p className="text-xs text-[#9CA3AF]">Abstract unavailable</p>}
              <p className="text-xs text-[#6B7280]">Indexed by {result.source || 'Academic database'}</p>
              <div className="flex flex-wrap gap-3">
                {(result.pdfUrl || result.freeUrl) && <a href={result.pdfUrl || result.freeUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold rounded-xl">{result.pdfUrl ? 'Free PDF' : 'Read free'}</a>}
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-[#E8E2D9] text-[#1B2E4B] text-sm font-semibold rounded-xl">View source</a>
                <a href={`/resources/reference-generator?lookup=${encodeURIComponent(result.doi || result.url)}`} className="px-4 py-2 bg-[#F5F0E8] text-[#1B2E4B] text-sm font-semibold rounded-xl">Cite this source</a>
              </div>
            </article>)}
          </div>}
        </div>
        {!searched && <div className="bg-[#FDFAF6] border border-[#E8E2D9] rounded-xl p-6 text-sm text-[#6B7280] space-y-2"><p className="font-bold text-[#1B2E4B]">Find a source you can use</p><p>Search your topic, narrow by publication year, and open an abstract to check relevance.</p><p><strong>Free PDF</strong> opens a direct PDF link. <strong>Read free</strong> opens a free full-text webpage. Other source pages may require a subscription.</p><p>Use “Cite this source” to retrieve its reference details. Always check the original source before citing it.</p></div>}
      </div>
    </main>
  )
}
