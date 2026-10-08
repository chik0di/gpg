import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import OrderCardWithReview from '@/components/dashboard/order-card-with-review'

export const metadata: Metadata = { title: 'My Orders' }

export default async function OrdersPage() {
  const supabase = createServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, subject_field, academic_level, deadline, status, total_amount, created_at, module_name')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2E4B]">My Orders</h1>
        <Link
          href="/order"
          className="ui-button-primary "
        >
          New order
        </Link>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCardWithReview
              key={order.id}
              order={order}
              moduleName={(order as any).module_name ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] py-20 text-center">
          <p className="text-sm text-[#64748B]">No orders yet.</p>
        </div>
      )}
    </div>
  )
}
