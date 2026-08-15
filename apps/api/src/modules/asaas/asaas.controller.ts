import { Controller, Post, Delete, Get, Param, Body, Req } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { PrismaClient, SubscriptionPlan } from '@contahub/database';
import { PLANS } from '@contahub/shared';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

@Controller('asaas')
export class AsaasController {
  constructor(private readonly asaasService: AsaasService) {}

  /**
   * POST /api/v1/asaas/subscribe
   * Inicia assinatura — cria customer no Asaas se não existir,
   * cria subscription e atualiza Subscription no banco.
   */
  @Post('subscribe')
  async subscribe(
    @Req() req: any,
    @Body() body: {
      planKey: 'STARTER' | 'PRO' | 'ENTERPRISE';
      billingType: 'CREDIT_CARD' | 'PIX';
      creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        phone: string;
      };
    },
  ) {
    const workspaceId = req.workspaceId;

    // Busca workspace + usuário owner para dados do customer
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: { where: { role: 'OWNER' }, take: 1 },
        subscription: true,
      },
    });

    if (!workspace) throw new Error('Workspace não encontrado');

    // Valor por plano (centavos → reais para Asaas)
    const planConfig = PLANS[body.planKey];
    if (!planConfig) throw new Error('Plano inválido');
    const value = planConfig.priceMonthly / 100; // centavos → reais

    // Cria ou reutiliza customer Asaas
    let asaasCustomerId = workspace.subscription?.asaasCustomerId;

    // Confirma que o customer salvo localmente ainda existe de verdade no Asaas
    if (asaasCustomerId) {
      const remoteCustomer = await this.asaasService.getCustomer(asaasCustomerId);
      if (!remoteCustomer) {
        asaasCustomerId = undefined;
      }
    }

    if (!asaasCustomerId) {
      const ownerClerkId = workspace.users[0]?.clerkUserId;
      let ownerEmail = workspace.name; // fallback só se realmente não achar nada

      if (ownerClerkId) {
        try {
          const clerkUser = await clerkClient.users.getUser(ownerClerkId);
          const foundEmail = clerkUser.emailAddresses.find(
            (e) => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress;
          if (foundEmail) ownerEmail = foundEmail;
        } catch (err) {
        // Segue com o fallback se a busca no Clerk falhar
        }
      }

      const customer = await this.asaasService.createCustomer({
        name:  workspace.name,
        email: ownerEmail,
        cpfCnpj: workspace.cnpj?.replace(/\D/g, '') ?? undefined,
      });
      asaasCustomerId = customer.id;
    }

  // ── Detecta troca de plano: confirma no Asaas (não só no nosso banco) ──
  const existingAsaasSubId = workspace.subscription?.asaasSubscriptionId;
  let isPlanChange = false;
  if (
    existingAsaasSubId &&
    workspace.subscription?.status === 'ACTIVE' &&
    workspace.subscription?.plan !== body.planKey
  ) {
    try {
      const remoteSub = await this.asaasService.getSubscription(existingAsaasSubId);
      // Só trata como troca de plano se o Asaas confirmar que ela está
      // realmente ativa lá — evita erro "não pode ser atualizada" quando
      // a assinatura já foi cancelada/deletada diretamente no painel Asaas.
      isPlanChange = remoteSub.status === 'ACTIVE';

      if (!isPlanChange) {
        // Dessincronia detectada: nosso banco achava ACTIVE, mas o Asaas
        // não confirma. Corrige o registro local antes de criar uma nova.
        await prisma.subscription.update({
          where: { workspaceId },
          data: { status: 'CANCELED', canceledAt: new Date() },
        });
      }
    } catch {
      // Se a consulta falhar (ex: assinatura não existe mais), trata como nova
      isPlanChange = false;
    }
  }

    let asaasSub: { id: string };

   if (isPlanChange) {
     // Troca de plano: atualiza a assinatura existente no Asaas (mesmo ID, novo valor)
     asaasSub = await this.asaasService.updateSubscription(existingAsaasSubId!, {
       value,
       description: `ContaHub — Plano ${body.planKey}`,
     });
   } else {

    // Próximo vencimento = amanhã
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];
    // Cria subscription nova no Asaas
    asaasSub = await this.asaasService.createSubscription({
      customer:    asaasCustomerId,
      billingType: body.billingType,
      value,
      nextDueDate: dueDateStr,
      description: `ContaHub — Plano ${body.planKey}`,
      ...(body.creditCard ? { creditCard: body.creditCard } : {}),
      ...(body.creditCardHolderInfo ? { creditCardHolderInfo: body.creditCardHolderInfo } : {}),
    });
  }

    // Atualiza Subscription no banco
    await prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        plan:                 body.planKey as SubscriptionPlan,
        status:               'ACTIVE',
        asaasCustomerId,
        asaasSubscriptionId:  asaasSub.id,
        currentPeriodStart:   new Date(),
        currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        workspaceId,
        plan:                 body.planKey as SubscriptionPlan,
        status:               'ACTIVE',
        asaasCustomerId,
        asaasSubscriptionId:  asaasSub.id,
        currentPeriodStart:   new Date(),
        currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      data: { asaasSubscriptionId: asaasSub.id, billingType: body.billingType },
      message: isPlanChange ? 'Plano alterado com sucesso' : 'Assinatura criada com sucesso',
    };
  }

  /**
   * DELETE /api/v1/asaas/subscribe
   * Cancela assinatura ativa.
   */
  @Delete('subscribe')
  async cancel(@Req() req: any) {
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId: req.workspaceId },
    });

    if (!sub?.asaasSubscriptionId) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }


    await prisma.subscription.update({
      where: { workspaceId: req.workspaceId },
      data:  { status: 'CANCELING', canceledAt: new Date() },
    });

    return { data: null, message: sub.currentPeriodEnd
      ? `Cancelamento agendado. Você mantém acesso completo até ${sub.currentPeriodEnd.toLocaleDateString('pt-BR')}.`
      : 'Cancelamento agendado. Seu acesso será mantido até o fim do período atual.',
     };
  }

  /**
   * GET /api/v1/asaas/invoices
   * Lista faturas da assinatura atual.
   */
  @Get('invoices')
  async getInvoices(@Req() req: any) {
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId: req.workspaceId },
      include: { invoices: { orderBy: { dueDate: 'desc' }, take: 24 } },
    });

    return {
      data: sub?.invoices ?? [],
      meta: { total: sub?.invoices?.length ?? 0 },
    };
  }
}
