import type { Metadata } from 'next'
import AuthForm from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Sign In' }

interface Props {
  searchParams: { next?: string; mode?: string }
}

function safeNext(raw: string | undefined): string {
  if (!raw) return '/dashboard'
  // Only allow same-origin relative paths
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export default function LoginPage({ searchParams }: Props) {
  const next = safeNext(searchParams.next)
  const initialMode = searchParams.mode === 'signup' ? 'signup' : 'signin'

  return <AuthForm next={next} initialMode={initialMode} />
}
