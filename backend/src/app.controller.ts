import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'
import { Public } from './shared/decorators/public.decorator'
import { apiOk } from './shared/http/api-response'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello() {
    return apiOk({ message: this.appService.getHello() })
  }

  @Public()
  @Get('health')
  getHealth() {
    return apiOk({ status: 'ok' })
  }
}
