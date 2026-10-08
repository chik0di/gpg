'use client'

import Link from 'next/link'
import SourceNotesEditor from './source-notes-editor'
import { workspaceList } from '@/lib/workspace-client'
import type { StudyProject } from '@/lib/workspace'
import { useEffect, useState } from 'react'
import type { SavedSource } from '@/lib/saved-sources'

export default function SavedSourcesClient({ projectId, embedded = false }: { projectId?: string; embedded?: boolean }) {
  const [projects, setProjects] = useState<StudyProject[]>([])
  const [filter, setFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [sources, setSources] = useState<SavedSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [removing, setRemoving] = useState<string | null>(null)

  async function loadSources(nextPage = 0) {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/saved-sources?page=${nextPage}${projectId ? `&project=${encodeURIComponent(projectId)}` : ''}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load your saved sources.')
      setSources(previous => nextPage === 0 ? data.sources : [...previous, ...data.sources])
      setPage(nextPage); setHasMore(data.hasMore)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load your saved sources.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadSources() }, [projectId])
  useEffect(() => { workspaceList<StudyProject>('projects').then(setProjects).catch(err => setError(err.message)) }, [])

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
      <div>{embedded ? <h2 className="text-lg font-semibold text-[#1B2E4B]">Readings</h2> : <h1 className="text-2xl font-bold text-[#1B2E4B]">Saved sources</h1>}<p className="text-sm text-[#6B7280] mt-1">Your reading list, available whenever you sign in.</p></div>
      <Link href={`/resources/research-finder${projectId && projectId !== 'unfiled' ? `?project=${projectId}` : ''}`} className="ui-button-primary ">Find more sources</Link>
    </div>
    {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error} <button onClick={() => void loadSources()} disabled={loading || removing !== null} className="underline font-semibold">Try again</button></div>}
    {loading && <p role="status" className="text-sm text-[#6B7280]">Loading saved sources…</p>}
    {!loading && !error && sources.length === 0 && <div className="ui-card p-8 text-center"><p className="font-semibold text-[#1B2E4B]">Your reading list is empty</p><p className="text-sm text-[#6B7280] mt-2">Save useful papers in the Research Finder and revisit them here.</p></div>}
    <div className="flex flex-wrap gap-3">
      <label className="text-sm">Reading status<select className="ui-input ml-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="to_read">To read</option><option value="reading">Reading</option><option value="read">Read</option></select></label>
      <label className="text-sm">Filter by tag<input className="ui-input ml-2" value={tagFilter} onChange={e => setTagFilter(e.target.value)} placeholder="Tag" /></label>
    </div>
    {(filter !== 'all' || tagFilter) && hasMore && <p className="text-sm text-[#64748B]">Filters apply to loaded readings. Load more to include the rest.</p>}
    {!loading && sources.length > 0 && !sources.some(s => (filter === 'all' || s.reading_status === filter) && (!tagFilter || s.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))) && <p className="text-sm">No loaded readings match these filters.</p>}
    {sources.filter(s => (filter === 'all' || s.reading_status === filter) && (!tagFilter || s.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())))).map(saved => {
      const source = saved.source_data
      return <article key={saved.id} className="ui-card p-5 space-y-3">
        <h2 className="font-semibold text-[#1B2E4B] break-words">{source.title}</h2>
        <p className="text-sm text-[#6B7280]">{source.authors}{source.year ? ` · ${source.year}` : ''}</p>
        {source.journal && <p className="text-sm text-[#1B2E4B]">{source.journal}</p>}
        {source.abstract && <details className="text-sm text-[#6B7280]"><summary className="cursor-pointer font-semibold">Abstract preview</summary><p className="mt-2 leading-relaxed">{source.abstract.slice(0, 1200)}{source.abstract.length > 1200 ? '…' : ''}</p></details>}
        <p className="text-xs text-[#64748B]">Saved {new Date(saved.created_at).toLocaleDateString('en-GB')}</p>
        <div className="flex flex-wrap gap-2 text-xs text-[#475569]"><span className="ui-status">{{ to_read: 'To read', reading: 'Reading', read: 'Read' }[saved.reading_status || 'to_read']}</span>{saved.project_id && <span className="ui-status max-w-full whitespace-normal break-words">{projects.find(p => p.id === saved.project_id)?.title || 'Project reading'}</span>}{saved.tags?.map(tag => <span key={tag} className="ui-status max-w-full whitespace-normal break-words">{tag}</span>)}</div>
        <div className="flex flex-wrap gap-2 pt-2">
          {(source.pdfUrl || source.freeUrl) && <a href={source.pdfUrl || source.freeUrl} target="_blank" rel="noopener noreferrer" className="ui-button-secondary">{source.pdfUrl ? 'Free PDF' : 'Read free'}</a>}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="ui-button-secondary">View source</a>
          <Link href={`/resources/reference-generator?lookup=${encodeURIComponent(source.doi || source.url)}${saved.project_id ? `&project=${saved.project_id}` : ''}`} className="ui-button-secondary">Cite this source</Link>
          <button onClick={() => void removeSource(saved.id)} disabled={removing !== null || loading} aria-label={`Remove ${source.title}`} className="px-4 py-2 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50">{removing === saved.id ? 'Removing…' : 'Remove'}</button>
        </div>
        <SourceNotesEditor source={saved} projects={projects} onSave={updated => setSources(previous => previous.map(s => s.id === updated.id ? updated : s).filter(s => !projectId || (projectId === 'unfiled' ? !s.project_id : s.project_id === projectId)))} />
      </article>
    })}
    {hasMore && <button onClick={() => void loadSources(page + 1)} disabled={loading || removing !== null} className="ui-button-secondary">Load more</button>}
  </div>
}
