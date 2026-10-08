import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { emptyProjectTools, projectToolsSchema, toolsSourceIds } from '@/lib/project-tools'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const reply = (value: unknown) => NextResponse.json(value, { headers: { 'Cache-Control': 'private, no-store' } })
async function handle(request: Request, projectId: string) {
  const db = createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return fail('Sign in to use your project tools.', 401)
  if (!z.string().uuid().safeParse(projectId).success) return fail('Invalid project.', 400)
  const { data: project, error: projectError } = await db.from('study_projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (projectError) return fail('Could not load your project.', 500)
  if (!project) return fail('Project not found in your workspace.', 404)
  const { data: existing, error } = await db.from('project_study_tools').select('content, updated_at').eq('project_id', projectId).eq('user_id', user.id).maybeSingle()
  if (error) return fail('Could not load your project tools. Please try again.', 500)
  if (request.method === 'GET') {
    const content = existing ? projectToolsSchema.safeParse(existing.content) : { success: true as const, data: emptyProjectTools }
    if (!content.success) return fail('This project plan contains invalid details.', 500)
    return reply({ content: content.data, version: existing?.updated_at || null })
  }
  let body
  try { const raw = await request.text(); body = raw.length <= 600000 ? JSON.parse(raw) : null } catch { body = null }
  const parsed = projectToolsSchema.safeParse(body?.content)
  if (!parsed.success) return fail('Check task titles, dates, source details and word budgets.', 400)
  if (body.version !== (existing?.updated_at || null)) return fail('This plan changed on another device. Reload the account version before saving.', 409)
  const ids = toolsSourceIds(parsed.data)
  if (ids.length) {
    const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100))
    const results = await Promise.all(batches.map(batch => db.from('saved_research_sources').select('id').eq('user_id', user.id).in('id', batch)))
    if (results.some(result => result.error)) return fail('Could not check linked readings.', 500)
    const owned = new Set(results.flatMap(result => (result.data || []).map(source => source.id)))
    const old = existing ? projectToolsSchema.safeParse(existing.content) : null
    const previous = new Set(old?.success ? toolsSourceIds(old.data) : [])
    if (ids.some(id => !owned.has(id) && !previous.has(id))) return fail('Link only readings saved in your own account.', 400)
    // Preserve written analysis when a linked reading has been removed.
    parsed.data.matrix = parsed.data.matrix.map(row => ({ ...row, source_id: row.source_id && owned.has(row.source_id) ? row.source_id : null }))
    parsed.data.outline = parsed.data.outline.map(row => ({ ...row, source_ids: row.source_ids.filter(id => owned.has(id)) }))
  }
  const record = { content: parsed.data }
  const query = existing
    ? db.from('project_study_tools').update(record).eq('project_id', projectId).eq('user_id', user.id).eq('updated_at', body.version)
    : db.from('project_study_tools').insert({ ...record, project_id: projectId, user_id: user.id })
  const { data: saved, error: saveError } = await query.select('content, updated_at').maybeSingle()
  if (saveError?.code === '23505' || !saveError && !saved) return fail('This plan changed on another device. Reload before saving.', 409)
  if (saveError || !saved) return fail('Could not save your project tools.', 500)
  return reply({ content: saved.content, version: saved.updated_at })
}
export const GET = (request: Request, { params }: { params: { id: string } }) => handle(request, params.id)
export const PUT = GET
