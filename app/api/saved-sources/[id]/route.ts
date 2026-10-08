import { z } from 'zod'
import { sourceNotesSchema } from '@/lib/workspace'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to remove a saved source.' }, { status: 401 })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) return NextResponse.json({ error: 'Invalid source ID.' }, { status: 400 })
  const { error } = await supabase.from('saved_research_sources').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not remove this source. Please try again.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to organise your sources.' }, { status: 401 })
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid source ID.' }, { status: 400 })
  let value
  try { const text = await request.text(); value = text.length <= 50000 ? sourceNotesSchema.safeParse(JSON.parse(text)) : null } catch { value = null }
  if (!value?.success) return NextResponse.json({ error: 'Check your notes, tags and project selection.' }, { status: 400 })
  if (value.data.project_id) {
    const { data, error } = await supabase.from('study_projects').select('id').eq('id', value.data.project_id).eq('user_id', user.id).maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Choose one of your own projects.' }, { status: 400 })
  }
  const { data, error } = await supabase.from('saved_research_sources').update(value.data).eq('id', params.id).eq('user_id', user.id)
    .select('id, source_key, source_data, created_at, project_id, reading_status, tags, notes, quotation, page_numbers').maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not save your notes.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Source not found in your reading list.' }, { status: 404 })
  return NextResponse.json({ source: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}
