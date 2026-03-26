import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../../shared/config/configuration'

/**
 * Side channel when invite tokens are not returned in the HTTP response.
 * Dev: logs token for manual testing. Prod: metadata only until real email is wired.
 */
@Injectable()
export class WorkspaceInviteDeliveryService {
  private readonly logger = new Logger(WorkspaceInviteDeliveryService.name)

  constructor(private readonly config: ConfigService) {}

  /**
   * When the API does not return the raw token, record how operators can complete the flow.
   * In non-production, logs the token for local testing. Never logs the token in production.
   */
  handleInviteCreated(payload: {
    inviteId: string
    workspaceId: string
    email: string
    expiresAt: Date
    rawToken: string
  }): void {
    const nodeEnv = this.config.get<AppConfig['nodeEnv']>('app.nodeEnv', { infer: true })
    if (nodeEnv === 'production') {
      this.logger.log(
        `Workspace invite created inviteId=${payload.inviteId} workspaceId=${payload.workspaceId} email=${payload.email} expiresAt=${payload.expiresAt.toISOString()} — token not exposed via API; plug in email (or set WORKSPACE_INVITE_EXPOSE_TOKEN=true only for non-prod debugging)`,
      )
      return
    }
    this.logger.log(
      `Workspace invite (dev): POST /v1/workspaces/invites/accept with body {"token":"<token>"} — inviteId=${payload.inviteId} email=${payload.email} token=${payload.rawToken}`,
    )
  }
}
