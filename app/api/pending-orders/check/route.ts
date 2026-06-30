import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Check if the authenticated user has any pending orders
 * Used by dashboard to show recovery banner
 */
export async function GET() {
  try {
    console.log('[pending-orders/check] Checking for pending orders...')
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[pending-orders/check] User:', user ? user.id : 'null', 'Email:', user?.email)

    if (!user) {
      console.log('[pending-orders/check] No authenticated user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find any non-expired pending orders for this user
    console.log('[pending-orders/check] Querying pending_orders table...')
    console.log('[pending-orders/check] User email for RLS match:', user.email)

    const { data, error } = await supabase
      .from('pending_orders')
      .select('id, created_at, expires_at, user_email, user_id')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[pending-orders/check] Query failed:', error)
      console.error('[pending-orders/check] Error code:', error.code)
      console.error('[pending-orders/check] Error message:', error.message)
      return NextResponse.json({ hasPendingOrder: false })
    }

    console.log('[pending-orders/check] Query returned', data?.length || 0, 'results')

    if (!data || data.length === 0) {
      console.log('[pending-orders/check] No pending orders found (RLS may have filtered them out)')
      return NextResponse.json({ hasPendingOrder: false })
    }

    const pendingOrder = data[0]
    console.log('[pending-orders/check] Found pending order:', pendingOrder.id)
    console.log('[pending-orders/check] Order user_email:', pendingOrder.user_email)
    console.log('[pending-orders/check] Order user_id:', pendingOrder.user_id)
    console.log('[pending-orders/check] Current user:', user.id, user.email)

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
