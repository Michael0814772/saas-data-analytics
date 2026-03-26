import { IsUUID } from 'class-validator'

export class TransferWorkspaceOwnershipDto {
  @IsUUID('4')
  newOwnerUserId: string
}
