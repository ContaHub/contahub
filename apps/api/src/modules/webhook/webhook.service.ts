import { Injectable, Logger } from '@nestjs/common';
import { prisma, ModuleKey } from '@contahub/database';
import { JobsProducerService } from '../jobs/jobs-producer.service';
import type { WorkspaceWelcomePayload } from '@contahub/shared';

const DEFAULT_MODULES = [
  'CRM', 'FISCAL', 'DOCUMENTS', 'COMMUNICATION',
  'CLIENT_PORTAL', 'FINANCIAL', 'BI', 'AUTOMATION',
];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly jobsProducer: JobsProducerService) {}

  async handleUserCreated(data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name?: string;
    last_name?: string;
  }) {
    const clerkUserId = data.id;
    const email      = data.email_addresses?.[0]?.email_address ?? '';
    const firstName  = data.first_name ?? '';
    const lastName   = data.last_name ?? '';
    const fullName   = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];

    this.logger.log(`Novo usuário Clerk: ${clerkUserId} — ${email}`);

    // Verifica se já tem workspace (evita duplicatas em caso de reenvio do webhook)
    const existing = await prisma.workspaceUser.findFirst({
      where: { clerkUserId },
    });

    if (existing) {
      this.logger.warn(`Usuário ${clerkUserId} já tem workspace — ignorando`);
      return;
    }

    // Gera slug único a partir do nome/email
    const baseSlug = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Cria workspace com trial de 14 dias
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const workspace = await prisma.workspace.create({
      data: {
        name: `Escritório de ${fullName}`,
        slug,
        clerkOrgId: clerkUserId,
        trialEndsAt,
      } as any,
    });

    // Vincula usuário como OWNER
    await prisma.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        clerkUserId,
        role: 'OWNER',
        isActive: true,
      },
    });

    // Habilita todos os módulos padrão
    for (const moduleKey of DEFAULT_MODULES) {
      await prisma.workspaceModule.create({
        data: {
          workspaceId: workspace.id,
          moduleKey: moduleKey as ModuleKey,
          isEnabled: true,
        },
      });
    }

    this.logger.log(`Workspace criado: ${workspace.slug} (${workspace.id})`);

    // ── E-mail de boas-vindas ao contador ─────────────────────────────────
    // Só enfileira se tiver e-mail — nunca quebra o fluxo principal
    if (email) {
      try {
        const dashboardUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';

        const trialDays = 14; // calculado no momento da criação

        const welcomePayload: WorkspaceWelcomePayload = {
          workspaceName: workspace.name,
          dashboardUrl:  `${dashboardUrl}/dashboard`,
          trialDays,
        };

        await this.jobsProducer.queueEmail({
          template:      'workspace-welcome',
          to:            email,
          recipientName: firstName || fullName,
          payload:       welcomePayload,
        });

        this.logger.log(`E-mail de boas-vindas enfileirado para: ${email}`);
      } catch (err) {
        // Falha no e-mail nunca deve impedir o onboarding
        this.logger.error(`Erro ao enfileirar e-mail de boas-vindas: ${err.message}`);
      }
    }
  }
}