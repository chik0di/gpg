import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revisionUser, notifyRevision, revisionMutationError } from '@/lib/revision-server'
import { revisionFileError, revisionStoragePath } from '@/lib/revision-files'
import { getOriginFromRequest } from '@/lib/utils/request-origin'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'
import type { OrderRevision } from '@/lib/revisions'

export async function PATCH(request: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  let uploadedPath: string | null = null
  let saved = false
  try {
    const user = await revisionUser(true)
    if (!user) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (!rateLimit(`revision-admin:${user.id}`, RateLimitPresets.admin).success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    const form = await request.formData()
    const status = String(form.get('status')) as OrderRevision['status']
    const response = String(form.get('response') || '').trim()
    if (!['in_progress', 'declined', 'delivered'].includes(status)) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    if (response.length > 5000 || (status === 'declined' && response.length < 10)) return NextResponse.json({ error: 'Provide an explanation of 10–5,000 characters when declining.' }, { status: 400 })
    const { data: revision } = await supabaseAdmin.from('order_revisions').select('id, status').eq('id', params.revisionId).eq('order_id', params.id).single()
    if (!revision) return NextResponse.json({ error: 'Revision not found.' }, { status: 404 })
    if (status === 'delivered') {
      if (revision.status !== 'in_progress') return NextResponse.json({ error: 'Start the revision before delivering it.' }, { status: 409 })
      const file = form.get('file')
      if (!(file instanceof File)) return NextResponse.json({ error: 'Choose the revised work file.' }, { status: 400 })
      const error = revisionFileError(file, true)
      if (error) return NextResponse.json({ error }, { status: 400 })
      uploadedPath = revisionStoragePath(params.id, file, true)
      const { error: uploadError } = await supabaseAdmin.storage.from('order-files').upload(uploadedPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type || 'application/octet-stream' })
      if (uploadError) throw new Error('Delivery upload failed')
    }
    const { data, error } = await supabaseAdmin.rpc('update_order_revision', {
      p_order_id: params.id, p_revision_id: params.revisionId, p_actor_id: user.id,
      p_admin: true, p_status: status, p_response: response, p_file_path: uploadedPath,
    })
    if (error) return NextResponse.json({ error: revisionMutationError(error.message) }, { status: 409 })
    saved = true
    const notification = await notifyRevision(params.id, status, getOriginFromRequest(request))
    return NextResponse.json({ revision: data, notification })
  } catch {
    return NextResponse.json({ error: 'Could not save the revision. Please try again.' }, { status: 500 })
  } finally {
    if (uploadedPath && !saved) await supabaseAdmin.storage.from('order-files').remove([uploadedPath])
  }
}
