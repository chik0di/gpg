import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/resource-rate-limit'
import { lookupReference } from '@/lib/reference-lookup'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  let input: unknown
  try { input = (await request.json()).input } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (typeof input !== 'string' || !input.trim() || input.length > 2000) return NextResponse.json({ error: 'Enter a DOI, ISBN, or webpage URL (up to 2,000 characters).' }, { status: 400 })
  const limit = await checkRateLimit(`reference:${getClientIP(request)}`)
  if (!limit.allowed) return NextResponse.json({ error: limit.error }, { status: 429 })
  try {
    return NextResponse.json(await lookupReference(input.trim()))
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const known = /^(Use a public|Only publicly|The webpage|This webpage|Paste a|Source not found|The source database|No citation|No book)/.test(message)
    return NextResponse.json({ error: known ? message : 'We could not retrieve this source. Check the link or enter its details manually.' }, { status: 422 })
  }
}
