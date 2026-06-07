import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
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

    const orderId  = params.id
    const formData = await request.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Fetch order to build the filename
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('subject_field, user_id')
      .eq('id', orderId)
      .single()

    const { data: profile } = order
      ? await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', order.user_id)
          .single()
      : { data: null }

    // Build renamed filename: SubjectField_FirstName_LastName_ShortOrderId.ext
    const ext        = file.name.split('.').pop() ?? 'pdf'
    const subject    = (order?.subject_field ?? 'File').replace(/[^a-zA-Z0-9]/g, '')
    const firstName  = (profile?.first_name ?? 'Unknown').replace(/[^a-zA-Z0-9]/g, '')
    const lastName   = (profile?.last_name  ?? 'Client').replace(/[^a-zA-Z0-9]/g, '')
    const shortId    = orderId.slice(0, 8).toUpperCase()
    const fileName   = `${subject}_${firstName}_${lastName}_${shortId}.${ext}`
    const storagePath = `completed/${orderId}/${fileName}`

    // Upload to Supabase Storage
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('order-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[upload] storage error:', uploadErr)
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
    }

    // Store the file path in order_files table
    const { error: dbErr } = await supabaseAdmin
      .from('order_files')
      .upsert(
        { order_id: orderId, file_url: storagePath, file_type: 'completed' },
        { onConflict: 'order_id,file_type' }
      )

    if (dbErr) {
      console.error('[upload] db error:', dbErr)
      return NextResponse.json({ error: 'Failed to record file' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, path: storagePath })
  } catch (err) {
    console.error('POST /api/admin/orders/[id]/upload:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
