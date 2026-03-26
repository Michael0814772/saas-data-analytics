import { IsEnum } from 'class-validator'
import { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'

export class UpdateWorkspaceMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole
}
