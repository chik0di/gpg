import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmailChangeSecurityNotification } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { oldEmail, newEmail } = await request.json()

    if (!oldEmail || !newEmail) {
      return NextResponse.json(
        { error: 'Both oldEmail and newEmail are required' },
        { status: 400 }
      )
    }

    console.log('[email-change-notification] Sending security notification:', {
      userId: user.id,
      oldEmail,
      newEmail: newEmail.replace(/(?<=.).(?=.*@)/g, '*'), // Log masked version
    })

    // Fetch user profile for first name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()

    // Send security notification to OLD email
    await sendEmailChangeSecurityNotification({
      to: oldEmail,
      newEmail,
      firstName: profile?.first_name ?? null,
    })

    console.log('[email-change-notification] Security notification sent successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[email-change-notification] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
