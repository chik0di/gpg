import { NextResponse } from 'next/server'
import { sendContactEnquiry } from '@/lib/resend'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Rate limiting - 10 contact forms per minute per IP
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(clientIp, RateLimitPresets.moderate)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, subject, message } = body as Record<string, unknown>

    if (
      typeof name    !== 'string' || !name.trim()    ||
      typeof email   !== 'string' || !email.trim()   ||
      typeof subject !== 'string' || !subject.trim() ||
      typeof message !== 'string' || !message.trim()
    ) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5000 characters).' }, { status: 400 })
    }

    await sendContactEnquiry({
      name:    name.trim(),
      email:   email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/contact:', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}
