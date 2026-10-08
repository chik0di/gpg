import { workspaceHandlers, bibliographyColumns } from '@/lib/workspace-server'
import { bibliographySchema } from '@/lib/workspace'
const handlers = workspaceHandlers('saved_bibliographies', bibliographySchema, bibliographyColumns)
const handle = (request: Request, { params }: { params: { id: string } }) => handlers.item(request, params.id)
export const GET = handle
export const PATCH = handle
export const DELETE = handle
