import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * On-demand revalidation endpoint
 * Call this after approving a review to immediately refresh the pages
 *
 * Usage:
 * POST /api/revalidate
 * Body: { path: '/' } or { path: '/reviews' } or { path: 'all' }
 * Headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: verify secret token to prevent abuse
    const secret = request.headers.get('x-revalidate-secret')
    if (process.env.REVALIDATE_SECRET && secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const body = await request.json()
    const { path } = body

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    // Revalidate specific path or all review pages
    if (path === 'all') {
      revalidatePath('/', 'page')
      revalidatePath('/reviews', 'page')
      console.log('[Revalidate] Revalidated both / and /reviews')
      return NextResponse.json({
        revalidated: true,
        paths: ['/', '/reviews'],
        timestamp: new Date().toISOString()
      })
    } else {
      revalidatePath(path, 'page')
      console.log('[Revalidate] Revalidated path:', path)
      return NextResponse.json({
        revalidated: true,
        path,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[Revalidate] Error:', error)
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 })
  }
}
