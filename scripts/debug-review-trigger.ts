import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function debugReviewTrigger(orderId?: string) {
  console.log('========================================')
  console.log('🔍 REVIEW TRIGGER DEBUG SCRIPT')
  console.log('========================================\n')

  // If no order ID provided, find the most recent completed order
  let targetOrderId = orderId

  if (!targetOrderId) {
    console.log('No order ID provided, finding most recent completed order...\n')

    const { data: recentOrder } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at, user_id')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!recentOrder) {
      console.log('❌ No completed orders found in database')
      return
    }

    targetOrderId = recentOrder.id
    console.log('✅ Found most recent completed order:', targetOrderId)
    console.log('   User ID:', recentOrder.user_id)
    console.log('   Created:', recentOrder.created_at)
    console.log()
  }

  console.log('========================================')
  console.log('STEP 1: ORDER STATUS CHECK')
  console.log('========================================')

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', targetOrderId)
    .single()

  if (orderError || !order) {
    console.log('❌ Order not found:', targetOrderId)
    console.log('   Error:', orderError)
    return
  }

  console.log('Order ID:', order.id)
  console.log('Status (raw):', JSON.stringify(order.status))
  console.log('Status (trimmed):', JSON.stringify(order.status?.trim()))
  console.log('Status === "completed":', order.status === 'completed')
  console.log('Status (lowercase) === "completed":', order.status?.toLowerCase() === 'completed')
  console.log('Module name:', order.module_name)
  console.log('Subject field:', order.subject_field)
  console.log()

  console.log('========================================')
  console.log('STEP 2: CHECK FOR EXISTING REVIEW')
  console.log('========================================')

  const { data: existingReview, error: reviewError } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('order_id', targetOrderId)

  console.log('Query error:', reviewError)
  console.log('Review exists:', !!existingReview && existingReview.length > 0)
  console.log('Review count:', existingReview?.length ?? 0)

  if (existingReview && existingReview.length > 0) {
    console.log('\n⚠️ EXISTING REVIEW FOUND:')
    existingReview.forEach((r, idx) => {
      console.log(`\nReview ${idx + 1}:`)
      console.log('  ID:', r.id)
      console.log('  Rating:', r.rating)
      console.log('  Review text:', r.review_text)
      console.log('  Display name:', r.display_name)
      console.log('  Is approved:', r.is_approved)
      console.log('  Created at:', r.created_at)
    })
  } else {
    console.log('✅ No review exists for this order')
  }
  console.log()

  console.log('========================================')
  console.log('STEP 3: TRIGGER CONDITIONS ANALYSIS')
  console.log('========================================')

  console.log('\n📍 Download Button Trigger (DownloadWithReview component):')
  console.log('   Location: components/orders/download-with-review.tsx')
  console.log('   Mount condition: order.status === "completed" && completedUrl')
  console.log('   Popup trigger: onClick of download button')
  console.log('   ')
  console.log('   Current evaluation:')
  console.log('   ├─ order.status === "completed"?', order.status === 'completed')
  console.log('   ├─ Has completed file?', '(need to check order_files table)')
  console.log('   └─ Would mount?', order.status === 'completed' ? '⚠️ YES (if file exists)' : '❌ NO')

  // Check for completed file
  const { data: files } = await supabaseAdmin
    .from('order_files')
    .select('*')
    .eq('order_id', targetOrderId)
    .eq('file_type', 'completed')

  console.log('\n   Completed file check:')
  console.log('   ├─ Completed file exists?', !!files && files.length > 0)
  if (files && files.length > 0) {
    console.log('   ├─ File path:', files[0].file_url)
    console.log('   └─ Download button WILL appear ✅')
  } else {
    console.log('   └─ Download button will NOT appear ❌')
  }

  console.log('\n📍 Dashboard Order Card Indicator (OrderCardWithReview component):')
  console.log('   Location: components/dashboard/order-card-with-review.tsx')
  console.log('   Show condition: showReviewIndicator === true')
  console.log('   ')
  console.log('   Logic flow:')
  console.log('   1. Check if order.status === "completed"')
  console.log('      └─ Current:', order.status === 'completed' ? '✅ PASS' : '❌ FAIL')
  console.log('   ')
  console.log('   2. Check localStorage for `reviewed_order_${orderId}`')
  console.log('      └─ (Cannot check from Node.js - browser-only)')
  console.log('      └─ Location: window.localStorage')
  console.log('      └─ Key: `reviewed_order_' + targetOrderId + '`')
  console.log('   ')
  console.log('   3. Call API /api/reviews/check?orderId=' + targetOrderId)

  // Simulate the API check
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: checkResult } = await anonClient
    .from('reviews')
    .select('id')
    .eq('order_id', targetOrderId)
    .maybeSingle()

  const hasReview = !!checkResult

  console.log('      └─ API returns hasReview:', hasReview)
  console.log('   ')
  console.log('   4. Set showReviewIndicator = !hasReview')
  console.log('      └─ Would show indicator?', !hasReview ? '✅ YES' : '❌ NO')

  console.log()
  console.log('========================================')
  console.log('STEP 4: EXPECTED BEHAVIOR')
  console.log('========================================')

  const shouldShowDownloadTrigger = order.status === 'completed' && files && files.length > 0
  const shouldShowDashboardIndicator = order.status === 'completed' && !hasReview

  console.log('\n✅ Download button review trigger:')
  console.log('   Should appear:', shouldShowDownloadTrigger ? 'YES ✅' : 'NO ❌')
  if (shouldShowDownloadTrigger) {
    console.log('   Trigger action: Clicking download button should:')
    console.log('     1. Check localStorage for reviewed_order_' + targetOrderId)
    console.log('     2. If not found, call /api/reviews/check?orderId=' + targetOrderId)
    console.log('     3. If no review exists, show ReviewPopup')
    console.log('     4. Expected result:', !hasReview ? '🎉 POPUP SHOULD SHOW' : '❌ Popup blocked (review exists)')
  }

  console.log('\n✅ Dashboard order card "Leave a review" indicator:')
  console.log('   Should appear:', shouldShowDashboardIndicator ? 'YES ✅' : 'NO ❌')
  if (!shouldShowDashboardIndicator && order.status === 'completed') {
    console.log('   Blocked because: Review already exists in database')
  }
  if (!shouldShowDashboardIndicator && order.status !== 'completed') {
    console.log('   Blocked because: Order status is not "completed"')
  }

  console.log()
  console.log('========================================')
  console.log('STEP 5: RECOMMENDED DEBUG ACTIONS')
  console.log('========================================')
  console.log()
  console.log('1. Open browser console (F12) and check for logs:')
  console.log('   - Look for "[DownloadWithReview]" logs when clicking download')
  console.log('   - Look for "[OrderCard]" logs when dashboard loads')
  console.log()
  console.log('2. Check localStorage in browser:')
  console.log('   - Open console and run: localStorage.getItem("reviewed_order_' + targetOrderId + '")')
  console.log('   - If it returns "true", that\'s blocking the trigger')
  console.log('   - To clear: localStorage.removeItem("reviewed_order_' + targetOrderId + '")')
  console.log()
  console.log('3. Check network tab:')
  console.log('   - When clicking download, should see GET /api/reviews/check?orderId=' + targetOrderId)
  console.log('   - Response should be: { "hasReview": ' + hasReview + ' }')
  console.log()
  console.log('4. Verify order detail page renders download button:')
  console.log('   - URL: /dashboard/orders/' + targetOrderId)
  console.log('   - Should see green "Download your completed work" button')
  console.log('   - If missing, check order_files table for file_type="completed"')
  console.log()
  console.log('========================================')
  console.log('DATABASE STATE SUMMARY')
  console.log('========================================')
  console.log('Order ID:', targetOrderId)
  console.log('Status:', order.status)
  console.log('Has completed file:', !!(files && files.length > 0))
  console.log('Has review:', hasReview)
  console.log('Expected popup on download:', shouldShowDownloadTrigger && !hasReview ? '✅ YES' : '❌ NO')
  console.log('Expected dashboard indicator:', shouldShowDashboardIndicator ? '✅ YES' : '❌ NO')
  console.log('========================================')
}

// Run with order ID from command line or use most recent completed order
const orderId = process.argv[2]
debugReviewTrigger(orderId).catch(console.error)
