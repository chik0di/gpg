'use client'
import { useState } from 'react'
import type { SavedSource } from '@/lib/saved-sources'
import { emptySourceNotes, type SourceNotes, type StudyProject } from '@/lib/workspace'
import { workspaceRequest } from '@/lib/workspace-client'

export default function SourceNotesEditor({ source, projects, onSave }: { source: SavedSource; projects: StudyProject[]; onSave: (source: SavedSource) => void }) {
  const [draft, setDraft] = useState<SourceNotes>({ ...emptySourceNotes, ...source })
  const [tags, setTags] = useState(source.tags?.join(', ') || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const change = (key: keyof SourceNotes, value: string | null) => { setDraft(d => ({ ...d, [key]: value })); setMessage('') }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const { source: saved } = await workspaceRequest<{ source: SavedSource }>(`/api/saved-sources/${source.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }) })
      onSave(saved); setMessage('Notes and reading details saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save notes.') }
    finally { setBusy(false) }
  }
  return <details className="border-t border-[#E8E2D9] pt-3">
    <summary className="cursor-pointer text-sm font-semibold text-[#1B2E4B]">Organise and add notes</summary>
    <form onSubmit={save} className="grid sm:grid-cols-2 gap-4 mt-4">
      <label className="text-sm">Project<select aria-label="Project" className="ui-input w-full mt-1" value={draft.project_id || ''} onChange={e => change('project_id', e.target.value || null)}><option value="">Unfiled reading</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label className="text-sm">Reading status<select aria-label="Reading status" className="ui-input w-full mt-1" value={draft.reading_status} onChange={e => change('reading_status', e.target.value)}><option value="to_read">To read</option><option value="reading">Reading</option><option value="read">Read</option></select></label>
      <label className="text-sm sm:col-span-2">Tags <span className="text-[#64748B]">(separate with commas; up to 20)</span><input className="ui-input w-full mt-1" value={tags} maxLength={1020} onChange={e => { setTags(e.target.value); setMessage('') }} placeholder="Theory, methodology, case study" /></label>
      <label className="text-sm sm:col-span-2">Your notes<textarea aria-label="Your notes" className="ui-input w-full mt-1 p-3" rows={4} maxLength={10000} value={draft.notes} onChange={e => change('notes', e.target.value)} placeholder="Why is this source useful? What do you think about its findings?" /></label>
      <label className="text-sm sm:col-span-2">Quotation<textarea aria-label="Quotation" className="ui-input w-full mt-1 p-3" rows={3} maxLength={10000} value={draft.quotation} onChange={e => change('quotation', e.target.value)} placeholder="Keep copied wording here, separate from your own notes." /></label>
      <label className="text-sm">Page numbers or location<input className="ui-input w-full mt-1" maxLength={200} value={draft.page_numbers} onChange={e => change('page_numbers', e.target.value)} placeholder="pp. 12–14, section 3" /></label>
      <div className="sm:col-span-2"><button disabled={busy} className="ui-button-primary">{busy ? 'Saving…' : 'Save reading details'}</button>{message && <p role="status" className="text-sm mt-2">{message}</p>}</div>
    </form>
  </details>
}
