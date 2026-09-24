import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function findUnreviewedOrder() {
  // Find all completed orders
  const { data: completedOrders } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, user_id, module_name')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  console.log('Total completed orders:', completedOrders?.length ?? 0)

  // Check each for existing review
  for (const order of (completedOrders ?? [])) {
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle()

    if (!review) {
      console.log('\n✅ FOUND UNREVIEWED COMPLETED ORDER:')
      console.log('Order ID:', order.id)
      console.log('Created:', order.created_at)
      console.log('Module:', order.module_name)
      console.log('User ID:', order.user_id)

      // Check for completed file
      const { data: files } = await supabaseAdmin
        .from('order_files')
        .select('*')
        .eq('order_id', order.id)
        .eq('file_type', 'completed')

      console.log('Has completed file:', !!files && files.length > 0)

      // Run debug script for this order
      console.log('\nRun: npx tsx scripts/debug-review-trigger.ts', order.id)
      return order.id
    }
  }

  console.log('\n❌ All completed orders have reviews')
}

findUnreviewedOrder().catch(console.error)
