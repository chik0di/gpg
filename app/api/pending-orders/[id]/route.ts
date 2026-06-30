import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[pending-orders/get] GET request for ID:', params.id)
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[pending-orders/get] User:', user ? user.id : 'null', 'Email:', user?.email)

    if (!user) {
      console.error('[pending-orders/get] No authenticated user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    console.log('[pending-orders/get] Fetching pending order:', id)
    console.log('[pending-orders/get] User email for RLS check:', user.email)

    // Fetch pending order (RLS ensures user can only see their own)
    const { data, error } = await supabase
      .from('pending_orders')
      .select('id, order_data, file_data, created_at, expires_at, user_email, user_id')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[pending-orders/get] Fetch failed:', error)
      console.error('[pending-orders/get] Error code:', error.code)
      console.error('[pending-orders/get] Error message:', error.message)
      console.error('[pending-orders/get] This could be due to RLS blocking access')
      return NextResponse.json(
        { error: 'Pending order not found' },
        { status: 404 }
      )
    }

    console.log('[pending-orders/get] Found order:', data.id)
    console.log('[pending-orders/get] Order user_email:', data.user_email)
    console.log('[pending-orders/get] Order user_id:', data.user_id)
    console.log('[pending-orders/get] Current user email:', user.email)
    console.log('[pending-orders/get] Email match:', data.user_email === user.email)

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (now > expiresAt) {
      console.log('[pending-orders/get] Pending order expired:', id)

      // Delete expired order
      await supabase
        .from('pending_orders')
        .delete()
        .eq('id', id)

      return NextResponse.json(
        { error: 'Pending order expired' },
        { status: 410 }
      )
    }

    console.log('[pending-orders/get] Retrieved pending order:', id, 'for user:', user.id)

    return NextResponse.json({
      id: data.id,
      orderData: data.order_data,
      fileData: data.file_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    })
  } catch (err) {
    console.error('[pending-orders/get] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Delete pending order (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('pending_orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[pending-orders/delete] Delete failed:', error)
      return NextResponse.json(
        { error: 'Failed to delete pending order' },
        { status: 500 }
      )
    }

    console.log('[pending-orders/delete] Deleted pending order:', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[pending-orders/delete] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
