import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  controllers: [IntegrationsController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class IntegrationsModule {}
