import { Controller, Post, Delete, Get, Param, Body, Req } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { PrismaClient, SubscriptionPlan } from '@contahub/database';

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
      plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
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
    const PLAN_PRICES: Record<string, number> = {
      STARTER:    97.00,
      PRO:        197.00,
      ENTERPRISE: 397.00,
    };

    const value = PLAN_PRICES[body.plan] ?? 97.00;

    // Cria ou reutiliza customer Asaas
    let asaasCustomerId = workspace.subscription?.asaasCustomerId;

    if (!asaasCustomerId) {
      const customer = await this.asaasService.createCustomer({
        name:  workspace.name,
        email: workspace.users[0]?.clerkUserId ?? workspace.name, // fallback
        cpfCnpj: workspace.cnpj?.replace(/\D/g, '') ?? undefined,
      });
      asaasCustomerId = customer.id;
    }

    // Próximo vencimento = amanhã
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    // Cria subscription no Asaas
    const asaasSub = await this.asaasService.createSubscription({
      customer:    asaasCustomerId,
      billingType: body.billingType,
      value,
      nextDueDate: dueDateStr,
      description: `ContaHub — Plano ${body.plan}`,
      ...(body.creditCard ? { creditCard: body.creditCard } : {}),
      ...(body.creditCardHolderInfo ? { creditCardHolderInfo: body.creditCardHolderInfo } : {}),
    });

    // Atualiza Subscription no banco
    await prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        plan:                 body.plan as SubscriptionPlan,
        status:               'ACTIVE',
        asaasCustomerId,
        asaasSubscriptionId:  asaasSub.id,
        currentPeriodStart:   new Date(),
        currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        workspaceId,
        plan:                 body.plan as SubscriptionPlan,
        status:               'ACTIVE',
        asaasCustomerId,
        asaasSubscriptionId:  asaasSub.id,
        currentPeriodStart:   new Date(),
        currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      data: { asaasSubscriptionId: asaasSub.id, billingType: body.billingType },
      message: 'Assinatura criada com sucesso',
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

    await this.asaasService.cancelSubscription(sub.asaasSubscriptionId);

    await prisma.subscription.update({
      where: { workspaceId: req.workspaceId },
      data:  { status: 'CANCELED', canceledAt: new Date() },
    });

    return { data: null, message: 'Assinatura cancelada' };
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
