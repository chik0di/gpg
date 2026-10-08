import { workspaceHandlers, projectColumns } from '@/lib/workspace-server'
import { projectSchema } from '@/lib/workspace'
const handlers = workspaceHandlers('study_projects', projectSchema, projectColumns)
export const GET = handlers.list
export const POST = handlers.create
