import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ReviewManagement from '@/components/admin/review-management'

export const metadata: Metadata = { title: 'Admin — Review Management' }

interface Review {
  id: string
  rating: number
  review_text: string | null
  display_name: string | null
  module_name: string | null
  created_at: string
  order_id: string
  user_id: string
  is_approved: boolean
}

export default async function ReviewsPage() {
  const { data: pendingReviews } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false }) as { data: Review[] | null }

  const { data: approvedReviews } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('is_approved', true)
    .order('created_at', { ascending: false }) as { data: Review[] | null }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Review Management</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Approve or reject client reviews
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-900">Pending reviews</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">
            {pendingReviews?.length ?? 0}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-green-900">Approved reviews</p>
          <p className="text-3xl font-extrabold text-green-600 mt-2">
            {approvedReviews?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Review management component */}
      <ReviewManagement
        pendingReviews={pendingReviews ?? []}
        approvedReviews={approvedReviews ?? []}
      />
    </div>
  )
}
