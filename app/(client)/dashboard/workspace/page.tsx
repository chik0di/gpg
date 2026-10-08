import type { Metadata } from 'next'
import WorkspaceClient from '@/components/dashboard/workspace-client'
export const metadata: Metadata = { title: 'My workspace' }
export default function WorkspacePage() { return <WorkspaceClient /> }
