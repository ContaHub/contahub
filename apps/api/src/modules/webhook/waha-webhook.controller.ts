import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { WahaWebhookService, WahaMessageEvent } from './waha-webhook.service';

@Controller('webhooks/whatsapp')
export class WahaWebhookController {
  private readonly logger = new Logger(WahaWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly wahaWebhook: WahaWebhookService,
  ) {}

  private isValidToken(token?: string): boolean {
    const secret = this.config.get<string>('WAHA_WEBHOOK_SECRET');
    if (!secret || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  @Post()
  @HttpCode(200)
  handle(@Query('token') token: string, @Body() body: WahaMessageEvent) {
    if (!this.isValidToken(token)) {
      throw new UnauthorizedException();
    }

    // Sem await: respondemos 200 na hora para o WAHA não reenviar o webhook.
    // Erros de processamento ficam só no log.
    void this.wahaWebhook.handleIncoming(body).catch((err) => {
      this.logger.error(`Falha ao processar mensagem: ${err}`);
    });

    return { ok: true };
  }
}