import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

// Session client + explicit owner filters + RLS; never trust a user_id in input.
export function workspaceHandlers(table: 'study_projects' | 'saved_bibliographies', schema: z.ZodType, columns: string) {
  const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
  const reply = (data: unknown) => NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  async function session() {
    const db = createServerClient()
    const { data: { user } } = await db.auth.getUser()
    return { db, user }
  }
  async function body(request: Request) {
    const text = await request.text()
    if (text.length > 600000) return null
    try { const parsed = schema.safeParse(JSON.parse(text)); return parsed.success ? parsed.data : null } catch { return null }
  }
  async function ownedProject(db: ReturnType<typeof createServerClient>, userId: string, value: unknown) {
    const projectId = (value as { project_id?: string | null }).project_id
    if (!projectId) return true
    const { data, error } = await db.from('study_projects').select('id').eq('id', projectId).eq('user_id', userId).maybeSingle()
    return !error && !!data
  }
  return {
    async list(request: Request) {
      const { db, user } = await session()
      if (!user) return fail('Sign in to use your workspace.', 401)
      const page = Number(new URL(request.url).searchParams.get('page') || '0')
      if (!Number.isInteger(page) || page < 0 || page > 100000) return fail('Invalid page.')
      const { data, error } = await db.from(table).select(columns).eq('user_id', user.id).order('created_at', { ascending: false }).order('id').range(page * 50, page * 50 + 50)
      if (error) return fail('Could not load your workspace. Please try again.', 500)
      return reply({ items: (data || []).slice(0, 50), hasMore: (data?.length || 0) > 50 })
    },
    async create(request: Request) {
      const { db, user } = await session()
      if (!user) return fail('Sign in to use your workspace.', 401)
      const value = await body(request)
      if (!value) return fail('Check the required fields and their lengths.')
      if (!await ownedProject(db, user.id, value)) return fail('Choose one of your own projects.')
      const { data, error } = await db.from(table).insert({ ...(value as object), user_id: user.id }).select(columns).single()
      if (error) return fail('Could not save this item. Please try again.', 500)
      return reply({ item: data })
    },
    async item(request: Request, id: string) {
      const { db, user } = await session()
      if (!user) return fail('Sign in to use your workspace.', 401)
      if (!z.string().uuid().safeParse(id).success) return fail('Invalid item ID.')
      if (request.method === 'GET') {
        const { data, error } = await db.from(table).select(columns).eq('id', id).eq('user_id', user.id).maybeSingle()
        if (error) return fail('Could not load this item.', 500)
        return data ? reply({ item: data }) : fail('This item was not found in your workspace.', 404)
      }
      if (request.method === 'DELETE') {
        const { data, error } = await db.from(table).delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
        if (error) return fail('Could not remove this item.', 500)
        return data ? reply({ success: true }) : fail('This item was not found in your workspace.', 404)
      }
      const value = await body(request)
      if (!value) return fail('Check the required fields and their lengths.')
      if (!await ownedProject(db, user.id, value)) return fail('Choose one of your own projects.')
      // Bibliographies use a version token so another device cannot silently overwrite edits.
      const version = request.headers.get('If-Unmodified-Since')
      if (table === 'saved_bibliographies' && (!version || !/^\d{4}-\d{2}-\d{2}T/.test(version) || !Number.isFinite(Date.parse(version)))) return fail('Reopen this bibliography before saving changes.')
      let query = db.from(table).update(value as object).eq('id', id).eq('user_id', user.id)
      if (version && table === 'saved_bibliographies') query = query.eq('updated_at', version)
      const { data, error } = await query.select(columns).maybeSingle()
      if (error) return fail('Could not save your changes.', 500)
      return data ? reply({ item: data }) : fail(table === 'saved_bibliographies' ? 'This bibliography has changed or was removed. Reopen it, or save your edits as a new bibliography.' : 'This project was not found.', table === 'saved_bibliographies' ? 409 : 404)
    },
  }
}
export const projectColumns = 'id, title, module, deadline, requirements, created_at, updated_at'
export const bibliographyColumns = 'id, title, project_id, style, sources, created_at, updated_at'
