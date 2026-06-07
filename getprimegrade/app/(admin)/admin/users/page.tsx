import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import UsersTable from '@/components/admin/users-table'

export const metadata: Metadata = { title: 'Admin — Users' }

export default async function AdminUsersPage() {
  const supabase = createServerClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <UsersTable users={users ?? []} />
    </div>
  )
}
