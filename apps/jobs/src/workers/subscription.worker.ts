import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { AsaasService } from '../services/asaas.service';

const prisma = new PrismaClient();
const TZ = 'America/Sao_Paulo';

/**
 * SubscriptionWorker
 *
 * Responsável por finalizar cancelamentos de assinatura agendados.
 *
 * Fluxo:
 * 1. Cliente pede cancelamento → status vira CANCELING, acesso de escrita
 *    já é bloqueado imediatamente (ver workspace.middleware.ts), mas o
 *    cliente continua com acesso de leitura até currentPeriodEnd.
 * 2. Todo dia à 00h10 (BRT), este worker varre assinaturas CANCELING cujo
 *    currentPeriodEnd já passou, cancela de fato no Asaas e marca CANCELED.
 *
 * Por que não cancelar no Asaas na hora do pedido?
 * Porque o cliente já pagou o ciclo vigente — cancelar de imediato no Asaas
 * poderia interromper o acesso antes do previsto. O cancelamento real na
 * gateway só acontece quando o período pago efetivamente termina.
 */
@Injectable()
export class SubscriptionWorker {
  private readonly logger = new Logger(SubscriptionWorker.name);
  private readonly asaasService = new AsaasService();

  @Cron('10 0 * * *', { name: 'finalize-canceling-subscriptions', timeZone: TZ })
  async finalizeCancelingSubscriptions() {
    this.logger.log('╔══ Verificando cancelamentos agendados ══╗');

    try {
      const now = new Date();

      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'CANCELING',
          currentPeriodEnd: { lte: now },
        },
      });

      this.logger.log(`${subscriptions.length} assinatura(s) para finalizar cancelamento`);

      let finalized = 0;
      let errors = 0;

      for (const sub of subscriptions) {
        try {
          if (sub.asaasSubscriptionId) {
            try {
              await this.asaasService.cancelSubscription(sub.asaasSubscriptionId);
            } catch (asaasErr) {
              // Se já estiver cancelada/inexistente no Asaas, apenas registra
              // e segue para finalizar o status local — o objetivo (parar de
              // cobrar) já foi alcançado por outro caminho.
              this.logger.warn(
                `Assinatura ${sub.asaasSubscriptionId} já estava cancelada/inexistente no Asaas: ${asaasErr.message}`,
                );
            }

          }

          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELED' },
          });

          finalized++;
          this.logger.log(`✓ Cancelamento finalizado — workspace: ${sub.workspaceId}`);
        } catch (err) {
          errors++;
          this.logger.error(
            `Erro ao finalizar cancelamento — workspace: ${sub.workspaceId}: ${err.message}`,
          );
        }
      }

      this.logger.log(`╚══ ${finalized} finalizada(s), ${errors} erro(s) ══╝`);
    } catch (err) {
      this.logger.error('Erro na varredura de cancelamentos:', err);
      throw err;
    }
  }
}