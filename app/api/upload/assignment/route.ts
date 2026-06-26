import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

// Allow common document formats for assignment briefs
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
]

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 413 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, Word, images, text files.' },
        { status: 400 }
      )
    }

    // Use a UUID so the path is unguessable even in a public-ish bucket.
    // Files are kept under assignments/temp/ until linked to a real order id
    // by /api/orders/create — no cleanup needed for an MVP.
    const tempId  = randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path    = `assignments/temp/${tempId}/${safeName}`

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('order-files')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadErr) {
      console.error('[upload/assignment] storage error:', uploadErr.message)
      return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 })
    }

    return NextResponse.json({ path })
  } catch (err) {
    console.error('[upload/assignment]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
