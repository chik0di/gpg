import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminDashboard from '@/components/admin/admin-dashboard'
import { getClientDisplayName } from '@/lib/utils/client-name'

export const metadata: Metadata = { title: 'Admin — Orders Dashboard' }

interface AdminOrder {
  id: string
  status: string
  total_amount: number
  academic_level: string
  module_name: string | null
  subject_field: string
  deadline: string
  created_at: string
  user_id: string
  is_outside_standard_fields: boolean
  profiles: { first_name: string | null; last_name: string | null; email: string } | null
  deliverables: Array<{ id: string }>
}

export default async function AdminPage() {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_amount, academic_level, module_name, subject_field, deadline, created_at, user_id, is_outside_standard_fields,
      profiles ( first_name, last_name, email ),
      deliverables ( id )
    `)
    .order('created_at', { ascending: false }) as { data: AdminOrder[] | null; error: any }

  const { data: activeRevisions, error: revisionError } = await supabaseAdmin.from('order_revisions').select('order_id').in('status', ['requested', 'in_progress'])
  if (revisionError) throw new Error('Could not load revision requests. Please try again.')
  const revisionOrderIds = new Set((activeRevisions ?? []).map(r => r.order_id))

  // Fetch approved reviews count
  const { count: approvedReviewsCount } = await supabaseAdmin
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)

  if (ordersError) throw new Error('Could not load the order queue. Please try again.')

  // Transform to simplified format for client component
  const transformedOrders = await Promise.all((orders ?? []).map(async order => {
    const client = order.profiles
    const clientName = await getClientDisplayName(order.user_id, client)

    return {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount,
      academic_level: order.academic_level,
      module_name: order.module_name,
      subject_field: order.subject_field,
      deadline: order.deadline,
      created_at: order.created_at,
      user_id: order.user_id,
      client_name: clientName,
      client_email: client?.email || '',
      deliverables_count: order.deliverables?.length || 0,
      is_outside_standard_fields: order.is_outside_standard_fields,
      has_active_revision: revisionOrderIds.has(order.id),
    }
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Work Management</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage all orders, track progress, and meet deadlines
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <p className="text-xs font-semibold text-green-900">Approved reviews</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">
            {approvedReviewsCount ?? 0}
          </p>
        </div>
      </div>

      {/* Dashboard */}
      <AdminDashboard initialOrders={transformedOrders} />
    </div>
  )
}
