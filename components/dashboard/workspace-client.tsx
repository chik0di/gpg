'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { workspaceList, workspaceRequest } from '@/lib/workspace-client'
import type { StudyProject, SavedBibliography } from '@/lib/workspace'
import SavedSourcesClient from './saved-sources-client'

const blank = { title: '', module: '', deadline: '', requirements: '' }
export default function WorkspaceClient() {
  const [projects, setProjects] = useState<StudyProject[]>([])
  const [bibliographies, setBibliographies] = useState<SavedBibliography[]>([])
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState(blank)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const project = projects.find(p => p.id === selected)
  async function load() {
    setLoading(true); setError('')
    try {
      const [p, b] = await Promise.all([workspaceList<StudyProject>('projects'), workspaceList<SavedBibliography>('bibliographies')])
      setProjects(p); setBibliographies(b)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load workspace.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { item } = await workspaceRequest<{ item: StudyProject }>(`/api/workspace/projects${editing ? `/${editing}` : ''}`, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      setProjects(p => editing ? p.map(v => v.id === item.id ? item : v) : [item, ...p]); setSelected(item.id); setShowForm(false); setEditing(null); setDraft(blank)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save project.') }
    finally { setBusy(false) }
  }
  async function remove(kind: 'projects' | 'bibliographies', id: string) {
    setBusy(true); setError('')
    try {
      await workspaceRequest(`/api/workspace/${kind}/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      if (kind === 'projects') { setSelected(''); setShowForm(false); setEditing(null) }
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove item.') }
    finally { setBusy(false) }
  }
  return <div className="space-y-6 text-[#1B2E4B]">
    <div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="page-heading text-3xl">My workspace</h1><p className="text-sm text-[#64748B] mt-2">Keep your projects, readings, notes and bibliographies together.</p></div><button className="ui-button-primary" disabled={busy || loading} onClick={() => { setEditing(null); setDraft(blank); setShowForm(true) }}>New project</button></div>
    {error && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{error} <button className="underline" disabled={busy || loading} onClick={() => void load()}>Retry loading</button></p>}
    {loading && <p role="status">Loading workspace…</p>}
    {showForm && <form onSubmit={save} className="ui-card p-5 space-y-4"><h2 className="font-semibold">{editing ? 'Edit project' : 'Create a project'}</h2><label className="block text-sm">Project title<input required maxLength={200} className="ui-input w-full mt-1" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Strategic project management report" /></label><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Module <span className="text-[#64748B]">(optional)</span><input maxLength={200} className="ui-input w-full mt-1" value={draft.module} onChange={e => setDraft(d => ({ ...d, module: e.target.value }))} /></label><label className="text-sm">Deadline <span className="text-[#64748B]">(optional)</span><input type="date" className="ui-input w-full mt-1" value={draft.deadline} onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))} /></label></div><label className="block text-sm">Assignment requirements<textarea aria-label="Assignment requirements" rows={4} maxLength={10000} className="ui-input w-full mt-1 p-3" value={draft.requirements} onChange={e => setDraft(d => ({ ...d, requirements: e.target.value }))} placeholder="Word count, questions to address, marking criteria…" /></label><div className="flex flex-wrap gap-2"><button className="ui-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save project'}</button><button type="button" className="ui-button-secondary" disabled={busy} onClick={() => setShowForm(false)}>Cancel</button></div></form>}
    {!loading && !error && projects.length === 0 && <div className="ui-card p-6"><h2 className="font-semibold">Start with an assignment or study goal</h2><p className="text-sm text-[#64748B] mt-2">Create a project, then save readings and references into it. Your existing saved sources are still available under All readings.</p></div>}
    <div className="flex flex-wrap gap-2" aria-label="Choose a project"><button className="ui-choice" aria-pressed={selected === ''} onClick={() => { setSelected(''); setConfirmDelete(null) }}>All readings</button><button className="ui-choice" aria-pressed={selected === 'unfiled'} onClick={() => { setSelected('unfiled'); setConfirmDelete(null) }}>Unfiled</button>{projects.map(p => <button key={p.id} className="ui-choice max-w-full break-words text-left" aria-pressed={selected === p.id} onClick={() => { setSelected(p.id); setConfirmDelete(null) }}>{p.title}</button>)}</div>
    {project && <section className="ui-card p-5 space-y-3"><h2 className="text-xl font-semibold break-words">{project.title}</h2><p className="text-sm text-[#64748B]">{project.module}{project.deadline ? ` · Due ${new Date(`${project.deadline}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC' })}` : ''}</p>{project.requirements && <p className="text-sm whitespace-pre-wrap break-words">{project.requirements}</p>}<div className="flex flex-wrap gap-2"><button className="ui-button-secondary" onClick={() => { setEditing(project.id); setDraft({ title: project.title, module: project.module, deadline: project.deadline || '', requirements: project.requirements }); setShowForm(true) }}>Edit project</button><button className="ui-button-secondary" disabled={busy} onClick={() => setConfirmDelete(project.id)}>Delete project</button></div>{confirmDelete === project.id && <div className="text-sm space-y-2"><p>Delete this project? Its readings, notes and bibliographies will remain in your account as unfiled items.</p><button className="ui-button-secondary" disabled={busy} onClick={() => void remove('projects', project.id)}>Confirm delete</button> <button className="ui-button-secondary" disabled={busy} onClick={() => setConfirmDelete(null)}>Cancel</button></div>}</section>}
    {!loading && !error && <SavedSourcesClient key={selected + projects.map(p => p.updated_at).join('')} embedded projectId={selected || undefined} />}
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Saved bibliographies</h2><Link className="ui-button-secondary" href={`/resources/reference-generator${project ? `?project=${project.id}` : ''}`}>Build a bibliography</Link></div>{!loading && !error && bibliographies.filter(b => !selected || (selected === 'unfiled' ? !b.project_id : b.project_id === selected)).length === 0 && <p className="text-sm text-[#64748B]">Create references in the Reference generator, then choose Save to account.</p>}{bibliographies.filter(b => !selected || (selected === 'unfiled' ? !b.project_id : b.project_id === selected)).map(b => <article key={b.id} className="ui-card p-5 space-y-3"><h3 className="font-semibold break-words">{b.title}</h3><p className="text-sm text-[#64748B]">{b.style} · {b.sources.length} references · Updated {new Date(b.updated_at).toLocaleDateString('en-GB')}</p><div className="flex flex-wrap gap-2"><Link className="ui-button-secondary" href={`/resources/reference-generator?bibliography=${b.id}`}>Open and export</Link><button className="ui-button-secondary" disabled={busy} onClick={() => setConfirmDelete(b.id)}>Delete</button></div>{confirmDelete === b.id && <div className="text-sm"><p className="mb-2">Delete this saved bibliography? Its reading sources will remain.</p><button className="ui-button-secondary" disabled={busy} onClick={() => void remove('bibliographies', b.id)}>Confirm delete</button> <button className="ui-button-secondary" disabled={busy} onClick={() => setConfirmDelete(null)}>Cancel</button></div>}</article>)}</section>
  </div>
}
