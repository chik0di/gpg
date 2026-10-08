'use client'

import { useEffect, useState } from 'react'
import type { StudyProject } from '@/lib/workspace'
import type { SavedSource } from '@/lib/saved-sources'
import { workspaceRequest } from '@/lib/workspace-client'
import { downloadTextFile, emptyProjectTools, localDay, matrixCsv, outlineText, projectToolsDraftSchema, projectToolsSchema, suggestTasks, type ProjectTools } from '@/lib/project-tools'

type Tab = 'planner' | 'matrix' | 'outline'
const matrixFields = [
  ['question', 'Research question'], ['methods', 'Methods / sample'], ['findings', 'Main findings'],
  ['limitations', 'Limitations'], ['relevance', 'Relevance to your assignment'],
] as const
const newId = () => crypto.randomUUID()

export default function ProjectStudyTools({ project }: { project: StudyProject }) {
  const [content, setContent] = useState<ProjectTools>(emptyProjectTools)
  const [baseline, setBaseline] = useState<ProjectTools>(emptyProjectTools)
  const [version, setVersion] = useState<string | null>(null)
  const [sources, setSources] = useState<SavedSource[]>([])
  const [tab, setTab] = useState<Tab>('planner')
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [compare, setCompare] = useState(false)
  const [confirmReload, setConfirmReload] = useState(false)
  const dirty = JSON.stringify(content) !== JSON.stringify(baseline)
  const storageKey = `gpg_project_tools_${project.id}`

  async function load(discard = false) {
    setLoading(true); setReady(false); setError(''); setMessage('')
    try {
      const account = await workspaceRequest<{ content: ProjectTools; version: string | null }>(`/api/workspace/projects/${project.id}/tools`)
      const parsed = projectToolsSchema.safeParse(account.content)
      if (!parsed.success) throw new Error('This project plan contains invalid details.')
      let restored = false
      if (!discard) {
        try {
          const draft = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
          const data = projectToolsDraftSchema.safeParse(draft?.content)
          const original = projectToolsSchema.safeParse(draft?.baseline)
          if (data.success && original.success && JSON.stringify(data.data) !== JSON.stringify(original.data)) {
            setContent(data.data); setBaseline(original.data); setVersion(draft.version); restored = true
            setMessage('Your unsaved browser draft was restored.')
            if (draft.version !== account.version) setError('The account plan has changed. Download your draft before reloading, or review the account version in another tab.')
          }
        } catch { /* Ignore invalid optional browser drafts. */ }
      }
      if (!restored) { setContent(parsed.data); setBaseline(parsed.data); setVersion(account.version) }
      setConfirmReload(false); setReady(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load project tools.') }
    finally { setLoading(false) }
  }
  async function loadSources() {
    setSourceError('')
    try {
      const readings: SavedSource[] = []
      for (let page = 0; ; page++) {
        const data = await workspaceRequest<{ sources: SavedSource[]; hasMore: boolean }>(`/api/saved-sources?project=${project.id}&page=${page}`)
        readings.push(...data.sources)
        if (!data.hasMore) break
      }
      setSources(readings)
    } catch (err) { setSourceError(err instanceof Error ? err.message : 'Could not load project readings.') }
  }
  useEffect(() => { void load(); void loadSources() }, [])
  useEffect(() => {
    if (loading || !ready) return
    try { sessionStorage.setItem(storageKey, JSON.stringify({ content, baseline, version })) }
    catch { setMessage('Browser storage is unavailable. Save your project tools before leaving.') }
  }, [content, baseline, version, loading, ready, storageKey])
  const edit = (next: ProjectTools) => { setContent(next); setMessage('') }
  async function save() {
    const parsed = projectToolsSchema.safeParse(content)
    if (!parsed.success) { setError('Check titles, dates and word budgets before saving.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const account = await workspaceRequest<{ content: ProjectTools; version: string }>(`/api/workspace/projects/${project.id}/tools`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: parsed.data, version }) })
      setContent(account.content); setBaseline(account.content); setVersion(account.version); setMessage('Project tools saved to your account.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your plan.') }
    finally { setBusy(false) }
  }
  function addMatrix() {
    const source = sources.find(s => s.id === selectedSource)
    if (!source || content.matrix.length >= 200) return
    edit({ ...content, matrix: [...content.matrix, { id: newId(), source_id: source.id, source_title: source.source_data.title, question: '', methods: '', findings: '', limitations: '', relevance: '' }] })
    setSelectedSource('')
  }
  function moveSection(index: number, direction: number) {
    const next = [...content.outline]; const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    edit({ ...content, outline: next })
  }
  const completed = content.tasks.filter(task => task.completed).length
  const allocated = content.outline.reduce((sum, section) => sum + section.word_budget, 0)

  return <section className="ui-card p-4 sm:p-6 space-y-5 text-[#1B2E4B]">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div><h2 className="text-lg font-semibold">Project tools</h2><p className="text-sm text-[#64748B] mt-1">Plan your work, compare evidence and shape your outline.</p></div>
      <button className="ui-button-primary" disabled={loading || busy || !ready || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : 'Save project tools'}</button>
    </div>
    {loading && <p role="status">Loading project tools…</p>}
    {error && <p role="alert" className="text-sm text-red-800 bg-red-50 rounded-lg p-3">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {!loading && !ready && <button className="ui-button-secondary" onClick={() => void load()}>Retry loading project tools</button>}
    {!loading && ready && <>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {dirty && <span role="status" className="text-[#815812]">Unsaved changes</span>}
        <button className="ui-link" disabled={busy} onClick={() => dirty ? setConfirmReload(true) : void load(true)}>Reload account version</button>
        {(dirty || error) && <button className="ui-link" onClick={() => downloadTextFile('project-plan-draft.json', JSON.stringify(content, null, 2), 'application/json')}>Download draft backup</button>}
      </div>
      {confirmReload && <div className="text-sm space-y-2"><p>Discard your unsaved changes and reload the account plan? You can download your draft first.</p><button className="ui-button-secondary" disabled={busy} onClick={() => void load(true)}>Discard and reload</button> <button className="ui-button-secondary" disabled={busy} onClick={() => setConfirmReload(false)}>Keep editing</button></div>}
      <div className="flex flex-wrap gap-2" aria-label="Project tools">
        {([['planner', 'Assignment planner'], ['matrix', 'Literature review matrix'], ['outline', 'Outline builder']] as const).map(([key, label]) => <button key={key} className="ui-choice" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
      {tab === 'planner' && <>
        <p className="text-sm text-[#64748B]">Suggested dates spread standard steps between today and your deadline. Edit them to suit your workload. Without a future deadline, steps are added without dates.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="ui-button-secondary" disabled={content.tasks.length > 94} onClick={() => {
            const steps = suggestTasks(project.deadline, localDay(), newId).filter(step => !content.tasks.some(task => task.title.toLowerCase() === step.title.toLowerCase()))
            edit({ ...content, tasks: [...content.tasks, ...steps] }); setMessage('Standard steps added. Existing tasks and dates were kept.')
          }}>Suggest checklist</button>
          <button className="ui-button-secondary" disabled={content.tasks.length >= 100} onClick={() => edit({ ...content, tasks: [...content.tasks, { id: newId(), title: 'New task', due_date: null, completed: false }] })}>Add task</button>
          <span className="text-sm">{completed} of {content.tasks.length} complete</span>
        </div>
        {content.tasks.length > 0 && <progress aria-label="Assignment progress" value={completed} max={content.tasks.length} className="w-full accent-[#1B2E4B]" />}
        <p className="text-xs text-[#64748B]">Changing the project deadline leaves your task dates intact. Save project tools to keep your checklist across devices.</p>
        {content.tasks.map((task, index) => <div key={task.id} className="border border-[#E8E2D9] rounded-lg p-3 flex flex-wrap gap-3 items-center">
          <input type="checkbox" checked={task.completed} aria-label={`Complete ${task.title}`} onChange={e => edit({ ...content, tasks: content.tasks.map(t => t.id === task.id ? { ...t, completed: e.target.checked } : t) })} className="w-5 h-5 accent-[#1B2E4B]" />
          <input aria-label={`Task ${index + 1} title`} className="ui-input flex-1 min-w-0 basis-48" value={task.title} maxLength={200} onChange={e => edit({ ...content, tasks: content.tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t) })} />
          <label className="text-xs">Due date<input aria-label={`Task ${index + 1} due date`} type="date" className="ui-input block max-w-full" value={task.due_date || ''} onChange={e => edit({ ...content, tasks: content.tasks.map(t => t.id === task.id ? { ...t, due_date: e.target.value || null } : t) })} /></label>
          <button className="text-sm text-red-700" aria-label={`Remove task ${index + 1}`} onClick={() => edit({ ...content, tasks: content.tasks.filter(t => t.id !== task.id) })}>Remove</button>
          {!task.completed && task.due_date && <span className="text-xs text-[#815812]">{task.due_date < localDay() ? 'Overdue' : project.deadline && task.due_date > project.deadline ? 'After project deadline' : ''}</span>}
        </div>)}
      </>}
      {tab === 'matrix' && <>
        <p className="text-sm text-[#64748B]">Record your own interpretation of each reading. Compare questions, methods, findings and limitations to build your literature review.</p>
        {sourceError && <p role="alert" className="text-sm text-red-800">{sourceError}</p>}
        <div className="flex flex-wrap gap-3 items-center">
          <select aria-label="Reading to compare" className="ui-input min-w-0 w-full sm:w-72" value={selectedSource} onChange={e => setSelectedSource(e.target.value)}><option value="">Choose a project reading</option>{sources.filter(s => !content.matrix.some(row => row.source_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.source_data.title}</option>)}</select>
          <button className="ui-button-secondary" disabled={!selectedSource || content.matrix.length >= 200} onClick={addMatrix}>Add reading to matrix</button>
          <button className="ui-link" onClick={() => void loadSources()}>Refresh readings</button>
          <button className="ui-button-secondary" disabled={!content.matrix.length} onClick={() => setCompare(v => !v)}>{compare ? 'Edit entries' : 'Compare table'}</button>
          <button className="ui-button-secondary" disabled={!content.matrix.length} onClick={() => downloadTextFile('literature-review.csv', matrixCsv(content), 'text/csv;charset=utf-8')}>Download matrix CSV</button>
        </div>
        {!sources.length && !sourceError && <p className="text-sm">Save readings into this project to add them to your matrix.</p>}
        {compare ? <div className="overflow-x-auto max-w-full" tabIndex={0} aria-label="Literature comparison table"><table className="text-sm min-w-[900px] w-full border-collapse"><thead><tr>{['Source', ...matrixFields.map(([, label]) => label)].map(label => <th key={label} className="text-left align-top border border-[#E8E2D9] p-3">{label}</th>)}</tr></thead><tbody>{content.matrix.map(row => <tr key={row.id}>{[row.source_title, ...matrixFields.map(([key]) => row[key])].map((value, i) => <td key={i} className="border border-[#E8E2D9] p-3 align-top whitespace-pre-wrap break-words min-w-40 max-w-64">{value || '—'}</td>)}</tr>)}</tbody></table></div> : content.matrix.map((row, index) => <article key={row.id} className="border border-[#E8E2D9] rounded-lg p-4 space-y-3">
          <div className="flex gap-3 justify-between"><h3 className="font-semibold break-words min-w-0">{row.source_title}</h3><button className="text-sm text-red-700 shrink-0" aria-label={`Remove matrix entry ${index + 1}`} onClick={() => edit({ ...content, matrix: content.matrix.filter(item => item.id !== row.id) })}>Remove entry</button></div>
          {!sources.some(s => s.id === row.source_id) && <p className="text-xs text-[#64748B]">This reading is no longer in this project. Your comparison notes are preserved.</p>}
          <div className="grid sm:grid-cols-2 gap-3">{matrixFields.map(([key, label]) => <label key={key} className="text-sm">{label}<textarea aria-label={`${label} for reading ${index + 1}`} rows={3} maxLength={5000} className="ui-input w-full mt-1 p-2" value={row[key]} onChange={e => edit({ ...content, matrix: content.matrix.map(item => item.id === row.id ? { ...item, [key]: e.target.value } : item) })} /></label>)}</div>
        </article>)}
      </>}
      {tab === 'outline' && <>
        <p className="text-sm text-[#64748B]">Build sections in your preferred order, allocate words and connect readings and their notes. Your brief determines which sections and words count.</p>
        <label className="text-sm block">Assignment word target<input aria-label="Assignment word target" type="number" min={0} max={100000} className="ui-input ml-2 max-w-36" value={content.word_target} onChange={e => edit({ ...content, word_target: Number(e.target.value) })} /></label>
        <p className="text-sm">Allocated: {allocated} words{content.word_target > 0 ? ` · ${allocated > content.word_target ? `${allocated - content.word_target} over target` : `${content.word_target - allocated} remaining`}` : ''}</p>
        <div className="flex flex-wrap gap-2">
          <button className="ui-button-secondary" disabled={content.outline.length >= 100} onClick={() => edit({ ...content, outline: [...content.outline, { id: newId(), heading: 'New section', word_budget: 0, notes: '', source_ids: [] }] })}>Add section</button>
          <button className="ui-button-secondary" disabled={content.outline.length > 0} onClick={() => {
            const target = content.word_target || 3000
            const headings = ['Introduction', 'Background and literature', 'Main analysis', 'Discussion', 'Conclusion']
            const fractions = [0.1, 0.2, 0.4, 0.2, 0.1]
            let used = 0
            const outline = headings.map((heading, i) => { const word_budget = i === headings.length - 1 ? target - used : Math.floor(target * fractions[i]); used += word_budget; return { id: newId(), heading, word_budget, notes: '', source_ids: [] } })
            edit({ ...content, word_target: target, outline })
          }}>Start with report outline</button>
          <button className="ui-button-secondary" disabled={!content.outline.length} onClick={() => downloadTextFile('assignment-outline.txt', outlineText(content, project.title), 'text/plain;charset=utf-8')}>Download outline</button>
          <button className="ui-link" onClick={() => void loadSources()}>Refresh readings and notes</button>
        </div>
        {sourceError && <p role="alert" className="text-sm text-red-800">{sourceError}</p>}
        {content.outline.map((section, index) => <article key={section.id} className="border border-[#E8E2D9] rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-[1fr_140px] gap-3"><label className="text-sm">Section heading<input aria-label={`Section ${index + 1} heading`} className="ui-input w-full mt-1" value={section.heading} maxLength={200} onChange={e => edit({ ...content, outline: content.outline.map(s => s.id === section.id ? { ...s, heading: e.target.value } : s) })} /></label><label className="text-sm">Word budget<input aria-label={`Section ${index + 1} word budget`} type="number" min={0} max={100000} className="ui-input w-full mt-1" value={section.word_budget} onChange={e => edit({ ...content, outline: content.outline.map(s => s.id === section.id ? { ...s, word_budget: Number(e.target.value) } : s) })} /></label></div>
          <label className="text-sm block">Section notes<textarea aria-label={`Section ${index + 1} notes`} className="ui-input w-full mt-1 p-2" rows={3} maxLength={5000} value={section.notes} onChange={e => edit({ ...content, outline: content.outline.map(s => s.id === section.id ? { ...s, notes: e.target.value } : s) })} /></label>
          <details><summary className="text-sm cursor-pointer font-semibold">Link readings ({section.source_ids.length})</summary><div className="space-y-3 mt-3">{sources.map(source => <div key={source.id} className="text-sm"><label className="flex items-start gap-2"><input type="checkbox" checked={section.source_ids.includes(source.id)} disabled={!section.source_ids.includes(source.id) && section.source_ids.length >= 50} onChange={e => edit({ ...content, outline: content.outline.map(s => s.id === section.id ? { ...s, source_ids: e.target.checked ? [...s.source_ids, source.id] : s.source_ids.filter(id => id !== source.id) } : s) })} /><span className="min-w-0 break-words">{source.source_data.title}</span></label>{section.source_ids.includes(source.id) && <div className="pl-5 text-[#64748B] whitespace-pre-wrap break-words">{source.notes && <p>Your notes: {source.notes}</p>}{source.quotation && <p>Quotation: “{source.quotation}” {source.page_numbers}</p>}</div>}</div>)}{section.source_ids.some(id => !sources.some(source => source.id === id)) && <p className="text-xs text-[#64748B]">Some linked readings have moved or been removed. Removed reading links are cleared on save.</p>}</div></details>
          <div className="flex flex-wrap gap-3"><button className="ui-button-secondary" disabled={index === 0} aria-label={`Move section ${index + 1} up`} onClick={() => moveSection(index, -1)}>Move up</button><button className="ui-button-secondary" disabled={index === content.outline.length - 1} aria-label={`Move section ${index + 1} down`} onClick={() => moveSection(index, 1)}>Move down</button><button className="text-sm text-red-700" aria-label={`Remove section ${index + 1}`} onClick={() => edit({ ...content, outline: content.outline.filter(s => s.id !== section.id) })}>Remove section</button></div>
        </article>)}
      </>}
      </fieldset>
    </>}
  </section>
}
