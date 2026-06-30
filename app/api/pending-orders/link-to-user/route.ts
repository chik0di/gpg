import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Link pending orders to authenticated user
 * After authentication, updates any pending_orders rows with matching email
 * to set user_id, which is crucial for RLS to work properly
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Normalize email to lowercase for case-insensitive comparison
    const emailLower = email.toLowerCase()

    console.log('[pending-orders/link] Linking pending orders for user:', user.id, 'email:', emailLower)

    // Update any pending orders with matching email that don't have user_id set yet
    const { data: updatedOrders, error } = await supabaseAdmin
      .from('pending_orders')
      .update({ user_id: user.id })
      .eq('user_email', emailLower)
      .is('user_id', null)
      .select('id')

    if (error) {
      console.error('[pending-orders/link] Failed to link pending orders:', error)
      return NextResponse.json(
        { error: 'Failed to link pending orders' },
        { status: 500 }
      )
    }

    const linkedCount = updatedOrders?.length || 0

    if (linkedCount > 0) {
      console.log('[pending-orders/link] Successfully linked', linkedCount, 'pending order(s)')
      console.log('[pending-orders/link] Order IDs:', updatedOrders!.map(o => o.id))
    } else {
      console.log('[pending-orders/link] No pending orders found to link (normal if user had no pending orders)')
    }

    return NextResponse.json({ linkedCount })
  } catch (err) {
    console.error('[pending-orders/link] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
