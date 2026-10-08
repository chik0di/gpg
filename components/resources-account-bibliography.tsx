'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { CitationSource, CitationStyle } from '@/lib/citation-formatter'
import { bibliographyDraftSchema, bibliographySchema, type SavedBibliography } from '@/lib/workspace'
import { workspaceRequest } from '@/lib/workspace-client'
import ProjectPicker from './resources-project-picker'

export default function AccountBibliography({ sources, style, ready, onLoad }: { sources: CitationSource[]; style: CitationStyle; ready: boolean; onLoad: (sources: CitationSource[], style: CitationStyle) => void }) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedBibliography | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [signIn, setSignIn] = useState(false)
  const loadCallback = useRef(onLoad)
  loadCallback.current = onLoad
  const changed = saved && (title !== saved.title || projectId !== saved.project_id || style !== saved.style || JSON.stringify(sources) !== JSON.stringify(saved.sources))
  const started = useRef(false)
  async function openAccount(id: string, discardDraft = false) {
    setBusy(true); setError('')
    try {
      const { item } = await workspaceRequest<{ item: SavedBibliography }>(`/api/workspace/bibliographies/${encodeURIComponent(id)}`)
      const parsed = bibliographySchema.safeParse(item)
      if (!parsed.success) throw new Error('This bibliography contains invalid source details.')
      let restored = false
      if (!discardDraft) {
        try {
          const draft = JSON.parse(sessionStorage.getItem('gpg_account_bibliography_draft') || 'null')
          const details = bibliographyDraftSchema.safeParse(draft?.details)
          const baseline = bibliographySchema.safeParse(draft?.saved)
          if (draft?.saved?.id === id && details.success && baseline.success && typeof draft.saved.updated_at === 'string' &&
              JSON.stringify(details.data) !== JSON.stringify(baseline.data)) {
            setSaved(draft.saved); setTitle(details.data.title); setProjectId(details.data.project_id)
            loadCallback.current(details.data.sources, details.data.style)
            setMessage('Your unsaved browser draft was restored. Save changes to keep it in your account.')
            if (draft.saved.updated_at !== item.updated_at) setError('The account version has changed. Save your draft as a new bibliography, or discard it and reload the account version.')
            restored = true
          }
        } catch { /* An invalid browser draft must not prevent opening the account copy. */ }
      }
      if (!restored) {
        setSaved(item); setTitle(item.title); setProjectId(item.project_id)
        loadCallback.current(parsed.data.sources, parsed.data.style)
        setMessage('Account bibliography opened. Review your references, edit them or download Word below.')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open bibliography.') }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!ready || started.current) return
    const id = new URLSearchParams(window.location.search).get('bibliography')
    if (!id) return
    started.current = true
    void openAccount(id)
    // Open once after the generator has restored its browser draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  useEffect(() => {
    if (!saved || busy || !ready) return
    try { sessionStorage.setItem('gpg_account_bibliography_draft', JSON.stringify({ saved, details: { title, project_id: projectId, style, sources } })) }
    catch { setError('Browser draft storage is unavailable. Save changes to your account before leaving this page.') }
  }, [saved, busy, ready, title, projectId, style, sources])
  useEffect(() => {
    if (saved && started.current) document.getElementById('account-bibliography')?.scrollIntoView({ block: 'start' })
  }, [saved?.id])
  async function save(asNew = false) {
    const parsed = bibliographySchema.safeParse({ title, project_id: projectId, style, sources })
    if (!parsed.success) { setError('Enter a name and add at least one valid reference (maximum 200).'); return }
    setBusy(true); setError(''); setMessage(''); setSignIn(false)
    try {
      const update = saved && !asNew
      const response = await fetch(`/api/workspace/bibliographies${update ? `/${saved.id}` : ''}`, { method: update ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', ...(update ? { 'If-Unmodified-Since': saved.updated_at } : {}) }, body: JSON.stringify(parsed.data) })
      const data = await response.json()
      if (response.status === 401) setSignIn(true)
      if (!response.ok) throw new Error(data.error || 'Could not save bibliography.')
      setSaved(data.item); setTitle(data.item.title); setMessage('Saved to your account. Reopen it from My workspace on any device.')
      // Keep the saved document identifiable when this page is refreshed.
      const url = new URL(window.location.href); url.searchParams.set('bibliography', data.item.id); url.searchParams.delete('project'); window.history.replaceState(null, '', url)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save bibliography.') }
    finally { setBusy(false) }
  }
  if (!sources.length && !saved && !busy && !error) return <p className="text-sm text-[#64748B]">Add references to your bibliography below, then save them to your account. <Link className="ui-link" href="/dashboard/workspace">Open saved bibliographies</Link></p>
  return <section id="account-bibliography" className="scroll-mt-24 ui-card p-5 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-[#1B2E4B]">{saved ? 'Account bibliography' : 'Save your bibliography to your account'}</h2><Link className="ui-link text-sm" href="/dashboard/workspace">My workspace</Link></div>
    <p className="text-sm text-[#64748B]">Browser drafts stay on this browser. Save here to keep a named bibliography across devices. Only references with source details are included.</p>
    <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm">Bibliography name<input className="ui-input w-full mt-1" value={title} disabled={busy} maxLength={200} onChange={e => { setTitle(e.target.value); setMessage('') }} placeholder="Project report references" /></label><ProjectPicker value={projectId} onChange={id => { setProjectId(id); setMessage('') }} initialiseFromUrl disabled={busy} /></div>
    <div className="flex flex-wrap gap-2"><button className="ui-button-primary" disabled={busy || !ready || !sources.length} onClick={() => void save()}>{busy ? 'Please wait…' : saved ? 'Save changes to account' : 'Save to account'}</button>{saved && <button className="ui-button-secondary" disabled={busy || !sources.length} onClick={() => void save(true)}>Save as new bibliography</button>}{changed && saved && <button className="ui-button-secondary" disabled={busy} onClick={() => void openAccount(saved.id, true)}>Discard changes and reload account version</button>}</div>
    {saved && <p className="text-xs text-[#64748B]">Account changes are saved when you press Save changes to account.</p>}
    {changed && <p role="status" className="text-sm text-[#815812]">You have unsaved account changes.</p>}
    {message && !changed && <p role="status" className="text-sm text-[#21633D]">{message}</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{signIn && <Link className="ui-link text-sm" href="/login?next=%2Fresources%2Freference-generator">Sign in / create account, then save your browser draft</Link>}
  </section>
}
