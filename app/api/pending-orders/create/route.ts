import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // Passive cleanup: delete all expired pending orders to prevent accumulation
    const { error: cleanupError } = await supabaseAdmin
      .from('pending_orders')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (cleanupError) {
      console.warn('[pending-orders/create] Cleanup warning (non-fatal):', cleanupError.message)
    } else {
      console.log('[pending-orders/create] Cleaned up expired pending orders')
    }

    const { email, orderData, fileData } = await request.json()

    if (!email || !orderData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if user is already authenticated
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Insert pending order (use admin client to bypass RLS for unauthenticated inserts)
    const { data, error } = await supabaseAdmin
      .from('pending_orders')
      .insert({
        user_email: email.toLowerCase().trim(),
        user_id: user?.id || null,
        order_data: orderData,
        file_data: fileData || null,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[pending-orders/create] Insert failed:', error)
      return NextResponse.json(
        { error: 'Failed to save order' },
        { status: 500 }
      )
    }

    console.log('[pending-orders/create] Created pending order:', data.id, 'for', email)

    return NextResponse.json({ pendingOrderId: data.id }, { status: 201 })
  } catch (err) {
    console.error('[pending-orders/create] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
