import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import OrderCardWithReview from '@/components/dashboard/order-card-with-review'
import StatsCards from '@/components/dashboard/stats-cards'
import PendingOrderBanner from '@/components/dashboard/pending-order-banner'
import PendingOrderSaver from '@/components/auth/pending-order-saver'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = createServerClient()

  const [{ data: { user } }, { data: profile }, { data: orders }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('first_name').single(),
    supabase
      .from('orders')
      .select('id, subject_field, academic_level, deadline, status, total_amount, created_at, module_name')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const firstName = profile?.first_name ?? null

  return (
    <div className="space-y-8">
      {/* Handle pending orders after OAuth redirects */}
      <PendingOrderSaver />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B2E4B]">
            {firstName ? `Welcome back, ${firstName}` : 'My Dashboard'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Here&apos;s an overview of your orders.
          </p>
        </div>
        <Link
          href="/order"
          className="ui-button-primary shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New order
        </Link>
      </div>

      {/* Pending Order Banner */}
      <PendingOrderBanner />

      {/* Stats */}
      <StatsCards orders={orders ?? []} />

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1B2E4B]">Recent orders</h2>
          {orders && orders.length > 0 && (
            <Link
              href="/dashboard/orders"
              className="text-sm font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
            >
              View all →
            </Link>
          )}
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
          <div className="ui-card py-12 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#F5F0E8' }}
            >
              <svg className="w-7 h-7 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#1B2E4B] mb-1">No orders yet</p>
            <p className="text-sm text-[#64748B] mb-6">Place your first order to get started.</p>
            <Link
              href="/order"
              className="ui-button-primary "
            >
              Place an order
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
