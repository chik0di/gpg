import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/admin-sidebar'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email !== 'admin@getprimegrade.com') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#F5F0E8' }}>
      <AdminSidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">{children}</main>
    </div>
  )
}
