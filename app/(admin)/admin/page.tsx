import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminDashboard from '@/components/admin/admin-dashboard'

export const metadata: Metadata = { title: 'Admin — Orders Dashboard' }

interface AdminOrder {
  id: string
  status: string
  total_amount: number
  academic_level: string
  subject_field: string
  deadline: string
  created_at: string
  user_id: string
  profiles: { first_name: string | null; last_name: string | null; email: string } | null
  deliverables: Array<{ id: string }>
}

export default async function AdminPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_amount, academic_level, subject_field, deadline, created_at, user_id,
      profiles ( first_name, last_name, email ),
      deliverables ( id )
    `)
    .order('created_at', { ascending: false }) as { data: AdminOrder[] | null }

  // Transform to simplified format for client component
  const transformedOrders = (orders ?? []).map(order => {
    const client = order.profiles
    const clientName = [client?.first_name, client?.last_name].filter(Boolean).join(' ') || 'Unknown Client'

    return {
      id: order.id,
      status: order.status,
      total_amount: order.total_amount,
      academic_level: order.academic_level,
      subject_field: order.subject_field,
      deadline: order.deadline,
      created_at: order.created_at,
      user_id: order.user_id,
      client_name: clientName,
      client_email: client?.email || '',
      deliverables_count: order.deliverables?.length || 0,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Work Management</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage all orders, track progress, and meet deadlines
        </p>
      </div>

      {/* Dashboard */}
      <AdminDashboard initialOrders={transformedOrders} />
    </div>
  )
}
