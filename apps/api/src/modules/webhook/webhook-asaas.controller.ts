import { Controller, Post, Req, Res, Headers, Logger } from '@nestjs/common';
import { PrismaClient } from '@contahub/database';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

/**
 * Webhook Asaas — atualiza Subscription e cria Invoice no banco
 *
 * Eventos tratados:
 * - PAYMENT_CONFIRMED   → fatura paga → status ACTIVE
 * - PAYMENT_RECEIVED    → igual ao CONFIRMED (PIX)
 * - PAYMENT_OVERDUE     → fatura vencida → status PAST_DUE
 * - PAYMENT_DELETED     → fatura removida
 * - SUBSCRIPTION_INACTIVATED → cancelada → status CANCELED
 */
@Controller('webhooks')
export class WebhookAsaasController {
  private readonly logger = new Logger(WebhookAsaasController.name);

  @Post('asaas')
  async handleAsaas(
    @Req()  req: Request,
    @Res()  res: Response,
    @Headers('asaas-access-token') token: string,
  ) {
    // Validação simples por token fixo — Asaas envia no header
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      this.logger.warn('Webhook Asaas rejeitado — token inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body;
    this.logger.log(`Webhook Asaas: ${event?.event} — payment: ${event?.payment?.id}`);

    try {
      await this.processEvent(event);
      return res.status(200).json({ received: true });
    } catch (err) {
      this.logger.error(`Erro ao processar webhook Asaas: ${err.message}`);
      // Retorna 200 mesmo com erro interno para evitar retry loop do Asaas
      return res.status(200).json({ received: true, error: err.message });
    }
  }

  private async processEvent(event: any) {
    const payment = event?.payment;
    if (!payment) return;

    const asaasSubscriptionId = payment.subscription;

    // Localiza Subscription pelo asaasSubscriptionId
    const sub = asaasSubscriptionId
      ? await prisma.subscription.findFirst({
          where: { asaasSubscriptionId },
        })
      : null;

    switch (event.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data:  {
              status:             'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          // Cria/atualiza Invoice no banco
          await prisma.invoice.upsert({
            where: { asaasPaymentId: payment.id },
            update: {
              status: 'PAID',
              paidAt: new Date(),
              paymentMethod: payment.billingType,
            },
            create: {
              workspaceId:    sub.workspaceId,
              subscriptionId: sub.id,
              asaasPaymentId: payment.id,
              amount:         Math.round((payment.value ?? 0) * 100), // reais → centavos
              status:         'PAID',
              dueDate:        new Date(payment.dueDate),
              paidAt:         new Date(),
              paymentMethod:  payment.billingType,
            },
          });

          this.logger.log(`Pagamento confirmado — workspace: ${sub.workspaceId}`);
        }
        break;
      }

      case 'PAYMENT_OVERDUE': {
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data:  { status: 'PAST_DUE' },
          });

          await prisma.invoice.upsert({
            where: { asaasPaymentId: payment.id },
            update: { status: 'OVERDUE' },
            create: {
              workspaceId:    sub.workspaceId,
              subscriptionId: sub.id,
              asaasPaymentId: payment.id,
              amount:         Math.round((payment.value ?? 0) * 100),
              status:         'OVERDUE',
              dueDate:        new Date(payment.dueDate),
              paymentMethod:  payment.billingType,
            },
          });
        }
        break;
      }

      case 'SUBSCRIPTION_INACTIVATED': {
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data:  { status: 'CANCELED', canceledAt: new Date() },
          });
          this.logger.log(`Subscription cancelada — workspace: ${sub.workspaceId}`);
        }
        break;
      }

      default:
        this.logger.log(`Evento não tratado: ${event.event}`);
    }
  }
}