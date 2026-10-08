import { workspaceHandlers, projectColumns } from '@/lib/workspace-server'
import { projectSchema } from '@/lib/workspace'
const handlers = workspaceHandlers('study_projects', projectSchema, projectColumns)
const handle = (request: Request, { params }: { params: { id: string } }) => handlers.item(request, params.id)
export const GET = handle
export const PATCH = handle
export const DELETE = handle
