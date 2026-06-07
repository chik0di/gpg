import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { orderSchema } from '@/lib/validations/order'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = orderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({ ...parsed.data, user_id: user.id, status: 'pending_payment' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ orders })
  } catch (err) {
    console.error('GET /api/orders', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
