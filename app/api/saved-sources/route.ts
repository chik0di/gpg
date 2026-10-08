import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { savedSourceSchema } from '@/lib/validations/saved-source'
import { z } from 'zod'
import { researchSourceKey } from '@/lib/saved-sources'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view your saved sources.' }, { status: 401 })
  const summary = request.nextUrl.searchParams.get('summary') === '1'
  const page = Number(request.nextUrl.searchParams.get('page') || '0')
  if (!Number.isInteger(page) || page < 0 || page > 100000) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 })
  if (summary) {
    const { data, error } = await supabase.from('saved_research_sources')
      .select('id, source_key').eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Could not check your saved sources. Please try again.' }, { status: 500 })
    return NextResponse.json({ sources: data }, { headers: { 'Cache-Control': 'private, no-store' } })
  }
  const project = request.nextUrl.searchParams.get('project')
  if (project && project !== 'unfiled' && !z.string().uuid().safeParse(project).success) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 })
  let query = supabase.from('saved_research_sources')
    .select('id, source_key, source_data, created_at, project_id, reading_status, tags, notes, quotation, page_numbers').eq('user_id', user.id)
  if (project === 'unfiled') query = query.is('project_id', null)
  else if (project) query = query.eq('project_id', project)
  const { data, error } = await query
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * 50, page * 50 + 50)
  if (error) {
    console.error('GET saved sources:', error.code)
    return NextResponse.json({ error: 'Could not load your saved sources. Please try again.' }, { status: 500 })
  }
  const sources = (data || []).slice(0, 50).flatMap(row => {
    const parsed = savedSourceSchema.safeParse(row.source_data)
    return parsed.success ? [{ ...row, source_data: parsed.data }] : []
  })
  return NextResponse.json({ sources, hasMore: (data?.length || 0) > 50 }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save this source.' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid source.' }, { status: 400 }) }
  const wrapped = body && typeof body === 'object' && body.source && typeof body.source === 'object' && !Array.isArray(body.source)
  const parsed = savedSourceSchema.safeParse(wrapped ? body.source : body)
  const projectId = wrapped ? body.project_id : undefined
  if (projectId !== undefined && projectId !== null && !z.string().uuid().safeParse(projectId).success) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 })
  if (projectId) {
    const { data, error } = await supabase.from('study_projects').select('id').eq('id', projectId).eq('user_id', user.id).maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Choose one of your own projects.' }, { status: 400 })
  }
  if (!parsed.success) return NextResponse.json({ error: 'This source contains missing or invalid details.' }, { status: 400 })
  let key
  try { key = researchSourceKey(parsed.data) } catch { return NextResponse.json({ error: 'Invalid source identifier.' }, { status: 400 }) }
  if (key.length > 2050) return NextResponse.json({ error: 'This source link is too long to save.' }, { status: 400 })
  // Upsert makes repeated clicks and concurrent saves produce one account-owned record.
  const { data, error } = await supabase.from('saved_research_sources')
    .upsert({ user_id: user.id, source_key: key, source_data: parsed.data, ...(projectId ? { project_id: projectId } : {}) }, { onConflict: 'user_id,source_key' })
    .select('id, source_key, source_data, created_at').single()
  if (error) {
    console.error('POST saved sources:', error.code)
    return NextResponse.json({ error: 'Could not save this source. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ source: data })
}
