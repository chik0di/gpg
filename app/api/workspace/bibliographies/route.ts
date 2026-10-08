import { workspaceHandlers, bibliographyColumns } from '@/lib/workspace-server'
import { bibliographySchema } from '@/lib/workspace'
const handlers = workspaceHandlers('saved_bibliographies', bibliographySchema, bibliographyColumns)
export const GET = handlers.list
export const POST = handlers.create
