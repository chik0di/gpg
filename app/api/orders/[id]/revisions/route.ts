import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revisionUser, notifyRevision, revisionMutationError } from '@/lib/revision-server'
import { revisionFileError, revisionStoragePath } from '@/lib/revision-files'
import { getOriginFromRequest } from '@/lib/utils/request-origin'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let uploadedPath: string | null = null
  let saved = false
  try {
    const user = await revisionUser()
    if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    if (!rateLimit(`revision:${user.id}:${getClientIp(request)}`, RateLimitPresets.orderCreation).success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    const { data: order } = await supabaseAdmin.from('orders').select('id').eq('id', params.id).eq('user_id', user.id).single()
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    const form = await request.formData()
    const instructions = String(form.get('instructions') || '').trim()
    if (instructions.length < 10 || instructions.length > 5000) return NextResponse.json({ error: 'Describe your changes in 10–5,000 characters.' }, { status: 400 })
    const attachment = form.get('attachment')
    let attachmentName: string | null = null
    if (attachment instanceof File && attachment.size > 0) {
      const error = revisionFileError(attachment, false)
      if (error) return NextResponse.json({ error }, { status: 400 })
      uploadedPath = revisionStoragePath(order.id, attachment, false)
      attachmentName = attachment.name.slice(0, 255)
      const { error: uploadError } = await supabaseAdmin.storage.from('order-files').upload(uploadedPath, Buffer.from(await attachment.arrayBuffer()), { contentType: attachment.type || 'application/octet-stream' })
      if (uploadError) throw new Error('Attachment upload failed')
    }
    const { data, error } = await supabaseAdmin.rpc('request_order_revision', {
      p_order_id: order.id, p_user_id: user.id, p_instructions: instructions,
      p_attachment_path: uploadedPath, p_attachment_name: attachmentName,
    })
    if (error) return NextResponse.json({ error: revisionMutationError(error.message) }, { status: 409 })
    saved = true
    await notifyRevision(order.id, 'requested', getOriginFromRequest(request))
    return NextResponse.json({ revision: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 })
  } finally {
    if (uploadedPath && !saved) await supabaseAdmin.storage.from('order-files').remove([uploadedPath])
  }
}
