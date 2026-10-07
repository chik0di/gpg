import type { Metadata } from 'next'
import SavedSourcesClient from '@/components/dashboard/saved-sources-client'

export const metadata: Metadata = { title: 'Saved sources' }

export default function SavedSourcesPage() {
  return <SavedSourcesClient />
}
