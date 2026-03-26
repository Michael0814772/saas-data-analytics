import type { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'

export type ApiKeyContext = {
  apiKeyId: string
  workspaceId: string
  sourceId: string
  permissions: string[]
}

