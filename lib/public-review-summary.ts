import type { SupabaseClient } from '@supabase/supabase-js'

// Exact counts avoid averaging only the preview or Supabase's first page of rows.
export async function publicReviewSummary(supabase: SupabaseClient): Promise<{ total: number; average: number } | null> {
  try {
    const results = await Promise.all([1, 2, 3, 4, 5].map(rating =>
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true).eq('rating', rating),
    ))
    if (results.some(result => result.error || result.count === null)) return null
    const total = results.reduce((sum, result) => sum + result.count!, 0)
    const weighted = results.reduce((sum, result, index) => sum + result.count! * (index + 1), 0)
    return { total, average: total ? weighted / total : 0 }
  } catch { return null }
}
