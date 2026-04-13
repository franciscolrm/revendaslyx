import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '@/auth/public.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '@/common/decorators/current-user.decorator';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private whatsapp: WhatsAppService) {}

  @Get('whatsapp/my-instance')
  async getMyInstance(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.getFullInstanceStatus(user.userId);
  }

  @Post('whatsapp/create-instance')
  async createInstance(@CurrentUser() user: CurrentUserPayload) {
    const name = `lyx-${user.userId.slice(0, 8)}`;
    return this.whatsapp.createInstance(user.userId, name);
  }

  @Get('whatsapp/qr-code')
  async getQrCode(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.getQrCode(user.userId);
  }

  @Get('whatsapp/connection-status')
  async getConnectionStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.getConnectionStatus(user.userId);
  }

  @Post('whatsapp/disconnect')
  async disconnect(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.disconnect(user.userId);
  }

  @Post('whatsapp/restart')
  async restart(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.restart(user.userId);
  }

  @Delete('whatsapp/my-instance')
  async deleteInstance(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.deleteInstance(user.userId);
  }

  @Post('whatsapp/send')
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { phone: string; message: string; client_id?: string },
  ) {
    return this.whatsapp.sendMessage(user.userId, {
      phone: body.phone,
      message: body.message,
      clientId: body.client_id,
    });
  }

  @Get('whatsapp/conversations')
  async getConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsapp.getConversations(user.userId);
  }

  @Get('whatsapp/conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsapp.getMessages(user.userId, conversationId, limit ? parseInt(limit, 10) : 50);
  }

  @Public()
  @Post('whatsapp/webhook')
  async webhook(@Body() body: any) {
    return this.whatsapp.handleWebhook(body);
  }
}
