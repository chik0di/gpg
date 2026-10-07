'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { SavedSource } from '@/lib/saved-sources'

export default function SavedSourcesClient() {
  const [sources, setSources] = useState<SavedSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [removing, setRemoving] = useState<string | null>(null)

  async function loadSources(nextPage = 0) {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/saved-sources?page=${nextPage}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load your saved sources.')
      setSources(previous => nextPage === 0 ? data.sources : [...previous, ...data.sources])
      setPage(nextPage); setHasMore(data.hasMore)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load your saved sources.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadSources() }, [])

  async function removeSource(id: string) {
    setRemoving(id); setError('')
    try {
      const response = await fetch(`/api/saved-sources/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not remove this source.')
      // Reload from the beginning so pagination cannot skip rows after deletion.
      await loadSources()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this source.') }
    finally { setRemoving(null) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-[#1B2E4B]">Saved sources</h1><p className="text-sm text-[#6B7280] mt-1">Your reading list, available whenever you sign in.</p></div>
      <Link href="/resources/research-finder" className="px-4 py-2 bg-[#E8A020] text-white font-bold text-sm rounded-xl">Find more sources</Link>
    </div>
    {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error} <button onClick={() => void loadSources()} disabled={loading || removing !== null} className="underline font-semibold">Try again</button></div>}
    {loading && <p role="status" className="text-sm text-[#6B7280]">Loading saved sources…</p>}
    {!loading && !error && sources.length === 0 && <div className="bg-white border border-[#E8E2D9] rounded-2xl p-8 text-center"><p className="font-semibold text-[#1B2E4B]">Your reading list is empty</p><p className="text-sm text-[#6B7280] mt-2">Save useful papers in the Research Finder and revisit them here.</p></div>}
    {sources.map(saved => {
      const source = saved.source_data
      return <article key={saved.id} className="bg-white border border-[#E8E2D9] rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-[#1B2E4B]">{source.title}</h2>
        <p className="text-sm text-[#6B7280]">{source.authors}{source.year ? ` · ${source.year}` : ''}</p>
        {source.journal && <p className="text-sm text-[#1B2E4B]">{source.journal}</p>}
        {source.abstract && <details className="text-sm text-[#6B7280]"><summary className="cursor-pointer font-semibold">Abstract preview</summary><p className="mt-2 leading-relaxed">{source.abstract.slice(0, 1200)}{source.abstract.length > 1200 ? '…' : ''}</p></details>}
        <p className="text-xs text-[#9CA3AF]">Saved {new Date(saved.created_at).toLocaleDateString('en-GB')}</p>
        <div className="flex flex-wrap gap-3">
          {(source.pdfUrl || source.freeUrl) && <a href={source.pdfUrl || source.freeUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#16A34A] text-white text-sm font-bold rounded-xl">{source.pdfUrl ? 'Free PDF' : 'Read free'}</a>}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-[#E8E2D9] text-[#1B2E4B] text-sm font-semibold rounded-xl">View source</a>
          <Link href={`/resources/reference-generator?lookup=${encodeURIComponent(source.doi || source.url)}`} className="px-4 py-2 bg-[#F5F0E8] text-[#1B2E4B] text-sm font-semibold rounded-xl">Cite this source</Link>
          <button onClick={() => void removeSource(saved.id)} disabled={removing !== null || loading} aria-label={`Remove ${source.title}`} className="px-4 py-2 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50">{removing === saved.id ? 'Removing…' : 'Remove'}</button>
        </div>
      </article>
    })}
    {hasMore && <button onClick={() => void loadSources(page + 1)} disabled={loading || removing !== null} className="px-4 py-2 border border-[#E8E2D9] rounded-xl text-sm font-semibold text-[#1B2E4B] disabled:opacity-50">Load more</button>}
  </div>
}
