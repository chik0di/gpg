import { redirect } from 'next/navigation'

interface Props {
  searchParams: { next?: string }
}

// /register is an alias — send straight to the combined auth page in signup mode
export default function RegisterPage({ searchParams }: Props) {
  const next = searchParams.next ?? '/dashboard'
  redirect(`/login?mode=signup${next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : ''}`)
}
