import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import OrderCard from '@/components/dashboard/order-card'

export const metadata: Metadata = { title: 'My Orders' }

export default async function OrdersPage() {
  const supabase = createServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, subject_field, academic_level, deadline, status, total_amount, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1B2E4B]">My Orders</h1>
        <Link
          href="/order"
          className="inline-flex items-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          New order
        </Link>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] py-20 text-center">
          <p className="text-sm text-[#9CA3AF]">No orders yet.</p>
        </div>
      )}
    </div>
  )
}
