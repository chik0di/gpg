import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import OrdersTable from '@/components/admin/orders-table'

export const metadata: Metadata = { title: 'Admin — All Orders' }

export default async function AdminOrdersPage() {
  const supabase = createServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles(email)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
      <OrdersTable orders={orders ?? []} showUser />
    </div>
  )
}
