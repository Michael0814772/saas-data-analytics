export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export const INVITABLE_WORKSPACE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
]
