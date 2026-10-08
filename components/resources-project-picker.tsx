'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { StudyProject } from '@/lib/workspace'
import { workspaceList } from '@/lib/workspace-client'

export default function ProjectPicker({ value, onChange, initialiseFromUrl = false, disabled = false }: { value: string | null; onChange: (id: string | null) => void; initialiseFromUrl?: boolean; disabled?: boolean }) {
  const [projects, setProjects] = useState<StudyProject[]>([])
  const [state, setState] = useState('loading')
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    let active = true
    workspaceList<StudyProject>('projects').then(items => {
      if (!active) return
      setProjects(items); setState('ready')
      const id = new URLSearchParams(window.location.search).get('project')
      if (initialiseFromUrl && !new URLSearchParams(window.location.search).has('bibliography') && items.some(p => p.id === id)) change.current(id)
    }).catch(() => { if (active) setState('unavailable') })
    return () => { active = false }
  }, [initialiseFromUrl])
  if (state === 'unavailable') return <p className="text-xs text-[#64748B]">Project selection is unavailable. <Link className="ui-link" href="/dashboard/workspace">Open My workspace</Link> to sign in or check your projects.</p>
  return <label className="block text-sm text-[#1B2E4B]">Save into project<select aria-label="Save into project" value={value || ''} disabled={disabled || state === 'loading'} onChange={e => onChange(e.target.value || null)} className="ui-input w-full mt-1"><option value="">{state === 'loading' ? 'Loading projects…' : 'Unfiled'}</option>{value && !projects.some(p => p.id === value) && <option value={value}>Selected project</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
}
