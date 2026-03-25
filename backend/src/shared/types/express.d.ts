import type { WorkspaceContext } from './workspace-context.type'

declare global {
  namespace Express {
    interface Request {
      workspaceContext?: WorkspaceContext
    }
  }
}

export {}
