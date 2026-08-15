import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@contahub/database";
import { getPlanConfig, type PlanKey } from "@contahub/shared";

const prisma = new PrismaClient();

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  async getSettings(workspaceId: string) {
    const rows = await prisma.$queryRaw<
      { notificationChannels: string[]; trialEndsAt: Date | null; name: string }[]
    >`
      SELECT "notificationChannels", "trialEndsAt", "name"
      FROM "public"."Workspace"
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    const ws = rows[0];
    const needsOnboarding = ws?.name?.startsWith('Escritório de ') ?? false;

    return {
      data: {
        notificationChannels: ws?.notificationChannels ?? ['WHATSAPP'],
        trialEndsAt: ws?.trialEndsAt ?? null,
        needsOnboarding,
      },
    };
  }

  async updateSettings(workspaceId: string, notificationChannels: string[]) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { notificationChannels },
    });
    return { data: { notificationChannels } };
  }

  async completeOnboarding(workspaceId: string, name: string, cnpj?: string) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, ...(cnpj ? { cnpj } : {}) },
    });
    return { data: { name }, message: 'Workspace atualizado' };
  }

  async getPlan(workspaceId: string) {
    const rows = await prisma.$queryRaw<
      { plan: string; status: string; trialEndsAt: string | Date | null; asaasSubscriptionId: string | null; currentPeriodEnd: string | Date | null }[]

    >`
      SELECT plan, status, "trialEndsAt", "asaasSubscriptionId", "currentPeriodEnd"
      FROM "public"."Subscription"
      WHERE "workspaceId" = ${workspaceId}
      LIMIT 1
    `;

    const sub = rows[0];

    this.logger.log(`[getPlan] workspaceId: ${workspaceId}`);
    this.logger.log(`[getPlan] raw sub: ${JSON.stringify(sub)}`);
    this.logger.log(`[getPlan] trialEndsAt type: ${typeof sub?.trialEndsAt}`);
    this.logger.log(`[getPlan] trialEndsAt value: ${sub?.trialEndsAt}`);

    const planKey: PlanKey = (sub?.plan as PlanKey) ?? 'STARTER';
    const status = sub?.status ?? 'TRIAL';

    let currentPeriodEnd: Date | null = null;
    if (sub?.currentPeriodEnd) {
      currentPeriodEnd = sub.currentPeriodEnd instanceof Date
      ? sub.currentPeriodEnd
      : new Date(sub.currentPeriodEnd as string);
    }

    let trialEndsAt: Date | null = null;
    if (sub?.trialEndsAt) {
      trialEndsAt = sub.trialEndsAt instanceof Date
        ? sub.trialEndsAt
        : new Date(sub.trialEndsAt as string);
    }

    this.logger.log(`[getPlan] trialEndsAt parsed: ${trialEndsAt}`);
    this.logger.log(`[getPlan] Date.now(): ${new Date()}`);

    let trialDaysLeft: number | null = null;
    if (trialEndsAt) {
      const diffMs = trialEndsAt.getTime() - Date.now();
      this.logger.log(`[getPlan] diffMs: ${diffMs}`);
      trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    this.logger.log(`[getPlan] trialDaysLeft: ${trialDaysLeft}`);

    const config = getPlanConfig(planKey);

    return {
      data: {
        plan: planKey,
        status,
        trialEndsAt: trialEndsAt?.toISOString() ?? null,
        trialDaysLeft,
        isTrialing: status === 'TRIAL',
        isActive: status === 'ACTIVE',
        currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
        config,
      },
    };
  }
}