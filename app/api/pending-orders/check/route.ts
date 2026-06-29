import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Check if the authenticated user has any pending orders
 * Used by dashboard to show recovery banner
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find any non-expired pending orders for this user
    const { data, error } = await supabase
      .from('pending_orders')
      .select('id, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[pending-orders/check] Query failed:', error)
      return NextResponse.json({ hasPendingOrder: false })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ hasPendingOrder: false })
    }

    const pendingOrder = data[0]
    console.log('[pending-orders/check] Found pending order for user:', user.id, '| order:', pendingOrder.id)

    return NextResponse.json({
      hasPendingOrder: true,
      pendingOrderId: pendingOrder.id,
      createdAt: pendingOrder.created_at,
      expiresAt: pendingOrder.expires_at,
    })
  } catch (err) {
    console.error('[pending-orders/check] Error:', err)
    return NextResponse.json({ hasPendingOrder: false })
  }
}
