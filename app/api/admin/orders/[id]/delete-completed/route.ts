import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@getprimegrade.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orderId = params.id

    // Get the completed file record
    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('order_files')
      .select('file_url')
      .eq('order_id', orderId)
      .eq('file_type', 'completed')
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('order-files')
      .remove([fileRecord.file_url])

    if (storageError) {
      console.error('[delete-completed] storage error:', storageError)
      return NextResponse.json({ error: 'Failed to delete file from storage' }, { status: 500 })
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('order_files')
      .delete()
      .eq('order_id', orderId)
      .eq('file_type', 'completed')

    if (dbError) {
      console.error('[delete-completed] db error:', dbError)
      return NextResponse.json({ error: 'Failed to delete file record' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/orders/[id]/delete-completed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
