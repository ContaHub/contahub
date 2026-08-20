import {
  Controller, Post, Req, Res, Headers, HttpCode, Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('clerk')
  @HttpCode(200)
  async handleClerk(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;

    if (!secret) {
      this.logger.error('CLERK_WEBHOOK_SECRET não configurado');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verifica assinatura do Svix (segurança)
    const wh = new Webhook(secret);
    let event: any;

    try {
      event = wh.verify(req.rawBody as Buffer, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      this.logger.warn(`Assinatura inválida: ${err.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    this.logger.log(`Evento Clerk recebido: ${event.type}`);

    if (event.type === 'user.created') {
      await this.webhookService.handleUserCreated(event.data);
    }

    return res.json({ received: true });
  }
}