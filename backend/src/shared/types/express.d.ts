import type { WorkspaceContext } from './workspace-context.type'

declare global {
  namespace Express {
    interface Request {
      workspaceContext?: WorkspaceContext
      requestId?: string
      correlationId?: string
      apiKeyContext?: {
        apiKeyId: string
        workspaceId: string
        sourceId: string
        permissions: string[]
      }
    }
  }
}

export {}
