import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revisionUser, notifyRevision, revisionMutationError } from '@/lib/revision-server'
import { getOriginFromRequest } from '@/lib/utils/request-origin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string; revisionId: string } }) {
  try {
    const user = await revisionUser()
    if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    const { data, error } = await supabaseAdmin.rpc('update_order_revision', {
      p_order_id: params.id, p_revision_id: params.revisionId, p_actor_id: user.id,
      p_admin: false, p_status: 'cancelled',
    })
    if (error) return NextResponse.json({ error: revisionMutationError(error.message) }, { status: 409 })
    await notifyRevision(params.id, 'cancelled', getOriginFromRequest(request))
    return NextResponse.json({ revision: data })
  } catch {
    return NextResponse.json({ error: 'Could not cancel your request.' }, { status: 500 })
  }
}
