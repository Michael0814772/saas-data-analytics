import { IsEmail, IsIn, MaxLength } from 'class-validator'
import { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'

export class CreateWorkspaceInviteDto {
  @IsEmail()
  @MaxLength(320)
  email: string

  @IsIn([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER
}

