import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { z } from 'zod'
import { citationSourceSchema } from '@/lib/citation-source-validation'
import { bibliographyDocument } from '@/lib/bibliography-export'
import { checkRateLimit, getClientIP } from '@/lib/resource-rate-limit'

const schema = z.object({ style: z.enum(['APA', 'Harvard', 'Vancouver', 'MLA', 'Chicago']), sources: z.array(citationSourceSchema).min(1).max(200) })
export async function POST(request: NextRequest) {
  let body
  try {
    const text = await request.text()
    if (text.length > 1000000) return NextResponse.json({ error: 'Your bibliography is too large to export.' }, { status: 413 })
    body = JSON.parse(text)
  } catch { return NextResponse.json({ error: 'Invalid bibliography.' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Check the bibliography details before exporting (maximum 200 sources).' }, { status: 400 })
  const limit = await checkRateLimit(`bibliography:${getClientIP(request)}`)
  if (!limit.allowed) return NextResponse.json({ error: limit.error }, { status: 429 })
  try {
    const buffer = await Packer.toBuffer(bibliographyDocument(parsed.data.sources, parsed.data.style))
    return new Response(new Uint8Array(buffer), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="bibliography-${parsed.data.style.toLowerCase()}.docx"`,
      'Cache-Control': 'no-store',
    } })
  } catch { return NextResponse.json({ error: 'Could not create the Word document. Please try again.' }, { status: 500 }) }
}
