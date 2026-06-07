import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/dashboard/dashboard-nav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      <DashboardNav user={user} profile={profile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  )
}
