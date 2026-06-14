import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Get meaningful name parts from user profile, auth metadata, or email
 * Returns [firstName, lastName] with fallbacks to ensure no 'Unknown' in filenames
 */
async function getUserNameForFilename(userId: string): Promise<[string, string]> {
  // Try to get from profile first
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', userId)
    .single()

  let firstName = profile?.first_name?.trim() || ''
  let lastName = profile?.last_name?.trim() || ''
  const email = profile?.email || ''

  // If profile is empty, try auth metadata
  if (!firstName && !lastName) {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authUser?.user_metadata) {
      const meta = authUser.user_metadata
      firstName = meta.given_name || meta.first_name || ''
      lastName = meta.family_name || meta.last_name || ''

      // Try splitting full_name if available
      if (!firstName && !lastName && typeof meta.full_name === 'string') {
        const parts = meta.full_name.trim().split(' ')
        firstName = parts[0] || ''
        lastName = parts.slice(1).join(' ') || ''
      }
    }
  }

  // Final fallback: use email prefix
  if (!firstName && !lastName && email) {
    const emailPrefix = email.split('@')[0]
    // Split on common delimiters
    const parts = emailPrefix.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) {
      firstName = parts[0]
      lastName = parts.slice(1).join('_')
    } else {
      firstName = parts[0] || 'Client'
      lastName = ''
    }
  }

  // Ensure at least one part is not empty
  if (!firstName && !lastName) {
    firstName = 'Client'
  }

  return [firstName, lastName]
}

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

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get meaningful name parts with fallbacks
    const [firstName, lastName] = await getUserNameForFilename(order.user_id)

    // Build renamed filename: SubjectField_FirstName_LastName_ShortOrderId.ext
    const ext        = file.name.split('.').pop() ?? 'pdf'
    const subject    = (order.subject_field ?? 'File').replace(/[^a-zA-Z0-9]/g, '')
    const firstClean = firstName.replace(/[^a-zA-Z0-9]/g, '') || 'Client'
    const lastClean  = lastName.replace(/[^a-zA-Z0-9]/g, '')
    const shortId    = orderId.slice(0, 8).toUpperCase()

    // Build filename with or without last name
    const namePart = lastClean ? `${firstClean}_${lastClean}` : firstClean
    const fileName   = `${subject}_${namePart}_${shortId}.${ext}`
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

    // Delete any existing completed file record first (to allow re-upload)
    await supabaseAdmin
      .from('order_files')
      .delete()
      .eq('order_id', orderId)
      .eq('file_type', 'completed')

    // Store the file path in order_files table
    const { error: dbErr } = await supabaseAdmin
      .from('order_files')
      .insert({
        order_id: orderId,
        file_url: storagePath,
        file_type: 'completed',
      })

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
