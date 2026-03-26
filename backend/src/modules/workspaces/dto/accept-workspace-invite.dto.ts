import { IsString, MinLength } from 'class-validator'

export class AcceptWorkspaceInviteDto {
  @IsString()
  @MinLength(32)
  token: string
}
