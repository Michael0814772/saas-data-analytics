import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedConfigModule } from './shared/config/shared-config.module';

@Module({
  imports: [SharedConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
