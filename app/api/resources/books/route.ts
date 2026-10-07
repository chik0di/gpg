import { NextRequest, NextResponse } from 'next/server'
import { searchBooks, bookEditions, lookupBook } from '@/lib/open-library'
import { checkRateLimit, getClientIP } from '@/lib/resource-rate-limit'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const title = params.get('title')?.trim(), author = params.get('author')?.trim() || ''
  const work = params.get('work'), edition = params.get('edition')
  const page = Number(params.get('page') || '1')
  if (!Number.isInteger(page) || page < 1 || page > 1000 || author.length > 200 ||
      (edition ? !/^\/books\/OL\d+M$/.test(edition) : work ? !/^\/works\/OL\d+W$/.test(work) : !title || title.length > 200)) {
    return NextResponse.json({ error: 'Enter a book title and optional author, or select a valid edition.' }, { status: 400 })
  }
  // Browsing editions needs several requests, separate from DOI/URL lookup quotas.
  const limit = await checkRateLimit(`books:${getClientIP(request)}`, { count: 120, spacingMs: 0 })
  if (!limit.allowed) return NextResponse.json({ error: limit.error }, { status: 429 })
  try {
    const data = edition ? { metadata: await lookupBook(edition), provider: 'Open Library' } : work ? await bookEditions(work, page) : await searchBooks(title!, author, page)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Could not retrieve book details. Please try again or use an ISBN instead.' }, { status: 502 })
  }
}
