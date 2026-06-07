import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function assertAdmin(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const supabase = createServerClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders })
}

export async function PATCH(request: Request) {
  const supabase = createServerClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status } = await request.json()
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}
