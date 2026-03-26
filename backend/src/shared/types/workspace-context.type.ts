import type { WorkspaceRole } from '../enums/workspace-role.enum'

export type WorkspaceContext = {
  workspaceId: string
  role: WorkspaceRole
  workspaceName: string
  workspaceCreatedAt: Date
}
