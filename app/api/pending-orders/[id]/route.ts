import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('========================================')
    console.log('[pending-orders/get] 🚀 GET REQUEST RECEIVED')
    console.log('[pending-orders/get] Timestamp:', new Date().toISOString())
    console.log('[pending-orders/get] Request URL:', request.url)
    console.log('[pending-orders/get] Pending order ID from params:', params.id)
    console.log('========================================')

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('----------------------------------------')
    console.log('[pending-orders/get] 🔐 AUTHENTICATION CHECK')
    console.log('[pending-orders/get] User authenticated:', !!user)
    console.log('[pending-orders/get] User ID:', user?.id || 'NULL')
    console.log('[pending-orders/get] User email:', user?.email || 'NULL')
    console.log('[pending-orders/get] Auth error:', authError?.message || 'none')
    console.log('----------------------------------------')

    if (!user) {
      console.error('========================================')
      console.error('[pending-orders/get] ❌ UNAUTHORIZED - No authenticated user')
      console.error('[pending-orders/get] This means the user is not logged in')
      console.error('[pending-orders/get] They should have been redirected to login first')
      console.error('[pending-orders/get] Returning 401 Unauthorized')
      console.error('========================================')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    console.log('----------------------------------------')
    console.log('[pending-orders/get] 📋 DATABASE QUERY STARTING')
    console.log('[pending-orders/get] Query params:')
    console.log('[pending-orders/get]   - Table: pending_orders')
    console.log('[pending-orders/get]   - ID to find:', id)
    console.log('[pending-orders/get]   - User email (for RLS):', user.email)
    console.log('[pending-orders/get]   - User ID (for RLS):', user.id)
    console.log('----------------------------------------')

    // Fetch pending order (RLS ensures user can only see their own)
    const { data, error } = await supabase
      .from('pending_orders')
      .select('id, order_data, file_data, created_at, expires_at, user_email, user_id')
      .eq('id', id)
      .single()

    console.log('----------------------------------------')
    console.log('[pending-orders/get] 📊 DATABASE QUERY RESULT')
    console.log('[pending-orders/get] Query successful:', !error)
    console.log('[pending-orders/get] Data returned:', !!data)
    console.log('[pending-orders/get] Error:', error ? JSON.stringify(error, null, 2) : 'none')
    console.log('----------------------------------------')

    if (error) {
      console.error('========================================')
      console.error('[pending-orders/get] ❌ DATABASE QUERY FAILED')
      console.error('[pending-orders/get] Error details:')
      console.error('[pending-orders/get]   - Code:', error.code)
      console.error('[pending-orders/get]   - Message:', error.message)
      console.error('[pending-orders/get]   - Details:', error.details)
      console.error('[pending-orders/get]   - Hint:', error.hint)
      console.error('[pending-orders/get] Possible causes:')
      console.error('[pending-orders/get]   1. Order ID does not exist in database')
      console.error('[pending-orders/get]   2. RLS policy blocking access (email mismatch)')
      console.error('[pending-orders/get]   3. Order already deleted/expired')
      console.error('[pending-orders/get] Query attempted:')
      console.error('[pending-orders/get]   - ID:', id)
      console.error('[pending-orders/get]   - User:', user.email)
      console.error('[pending-orders/get] Returning 404 Not Found')
      console.error('========================================')
      return NextResponse.json(
        { error: 'Pending order not found', details: error.message, code: error.code },
        { status: 404 }
      )
    }

    if (!data) {
      console.error('========================================')
      console.error('[pending-orders/get] ❌ NO DATA RETURNED (but no error)')
      console.error('[pending-orders/get] This is unusual - query succeeded but returned null')
      console.error('[pending-orders/get] Likely means no rows matched the query')
      console.error('[pending-orders/get] ID searched:', id)
      console.error('[pending-orders/get] User email:', user.email)
      console.error('[pending-orders/get] Returning 404 Not Found')
      console.error('========================================')
      return NextResponse.json(
        { error: 'Pending order not found' },
        { status: 404 }
      )
    }

    console.log('----------------------------------------')
    console.log('[pending-orders/get] ✅ ORDER FOUND - VALIDATING')
    console.log('[pending-orders/get] Order details:')
    console.log('[pending-orders/get]   - ID:', data.id)
    console.log('[pending-orders/get]   - Created at:', data.created_at)
    console.log('[pending-orders/get]   - Expires at:', data.expires_at)
    console.log('[pending-orders/get]   - User email (in order):', data.user_email)
    console.log('[pending-orders/get]   - User ID (in order):', data.user_id || 'NULL')
    console.log('[pending-orders/get]   - Current user email:', user.email)
    console.log('[pending-orders/get]   - Current user ID:', user.id)
    console.log('[pending-orders/get]   - Email match:', data.user_email === user.email)
    console.log('[pending-orders/get]   - User ID match:', data.user_id === user.id)
    console.log('[pending-orders/get]   - Has order_data:', !!data.order_data)
    console.log('[pending-orders/get]   - Has file_data:', !!data.file_data)
    console.log('----------------------------------------')

    // Check if expired - delete immediately and return 404 for clean checkout redirect
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    const isExpired = now > expiresAt

    console.log('----------------------------------------')
    console.log('[pending-orders/get] ⏰ EXPIRATION CHECK')
    console.log('[pending-orders/get] Current time:', now.toISOString())
    console.log('[pending-orders/get] Expires at:', expiresAt.toISOString())
    console.log('[pending-orders/get] Is expired:', isExpired)
    console.log('[pending-orders/get] Time remaining (minutes):', Math.round((expiresAt.getTime() - now.getTime()) / 60000))
    console.log('----------------------------------------')

    if (isExpired) {
      console.error('========================================')
      console.error('[pending-orders/get] ⏱️  ORDER EXPIRED - DELETING')
      console.error('[pending-orders/get] Order ID:', id)
      console.error('[pending-orders/get] Was created:', data.created_at)
      console.error('[pending-orders/get] Expired at:', data.expires_at)
      console.error('[pending-orders/get] Current time:', now.toISOString())
      console.error('[pending-orders/get] Deleting expired order...')
      console.error('========================================')

      // Delete expired order immediately
      const { error: deleteError } = await supabase
        .from('pending_orders')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[pending-orders/get] Failed to delete expired order:', deleteError)
      } else {
        console.log('[pending-orders/get] Successfully deleted expired order:', id)
      }

      // Return 404 so checkout redirects cleanly
      return NextResponse.json(
        { error: 'Pending order expired', expired: true },
        { status: 404 }
      )
    }

    console.log('========================================')
    console.log('[pending-orders/get] ✅ SUCCESS - RETURNING ORDER DATA')
    console.log('[pending-orders/get] Order ID:', data.id)
    console.log('[pending-orders/get] User:', user.email)
    console.log('[pending-orders/get] Has order data:', !!data.order_data)
    console.log('[pending-orders/get] Has file data:', !!data.file_data)
    console.log('[pending-orders/get] Timestamp:', new Date().toISOString())
    console.log('========================================')

    return NextResponse.json({
      id: data.id,
      orderData: data.order_data,
      fileData: data.file_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    })
  } catch (err) {
    console.error('========================================')
    console.error('[pending-orders/get] ❌ UNCAUGHT EXCEPTION')
    console.error('[pending-orders/get] Error type:', err instanceof Error ? err.constructor.name : typeof err)
    console.error('[pending-orders/get] Error message:', err instanceof Error ? err.message : String(err))
    console.error('[pending-orders/get] Error stack:', err instanceof Error ? err.stack : 'N/A')
    console.error('[pending-orders/get] Request ID:', params.id)
    console.error('[pending-orders/get] Timestamp:', new Date().toISOString())
    console.error('========================================')

    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
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
