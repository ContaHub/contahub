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

@Controller('webhooks/whatsapp')
export class WahaWebhookController {
  private readonly logger = new Logger(WahaWebhookController.name);

  constructor(private readonly config: ConfigService) {}

  private isValidToken(token?: string): boolean {
    const secret = this.config.get<string>('WAHA_WEBHOOK_SECRET');
    if (!secret || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  @Post()
  @HttpCode(200)
  handle(@Query('token') token: string, @Body() body: any) {
    if (!this.isValidToken(token)) {
      throw new UnauthorizedException();
    }

    // Ignora o que não é mensagem recebida (ex.: mensagens enviadas por você)
    if (body?.event === 'message' && !body?.payload?.fromMe) {
      this.logger.log(
        `Mensagem recebida de ${body.payload?.from}: ${body.payload?.body}`,
      );
      // Aqui entra a lógica do app (próximos passos)
    }

    // Responde rápido para o WAHA não reenviar
    return { ok: true };
  }
}