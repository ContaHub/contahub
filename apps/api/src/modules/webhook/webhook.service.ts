import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, ModuleKey } from '@contahub/database';
import { JobsProducerService } from '../jobs/jobs-producer.service';

const prisma = new PrismaClient();

const DEFAULT_MODULES: ModuleKey[] = [
  'CRM', 'FISCAL', 'DOCUMENTS', 'COMMUNICATION',
  'CLIENT_PORTAL', 'FINANCIAL', 'BI', 'AUTOMATION',
];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly jobsProducer: JobsProducerService) {}

  async handleUserCreated(event: any) {
    const clerkUserId: string = event.id;
    const email: string       = event.email_addresses?.[0]?.email_address ?? '';
    const firstName: string   = event.first_name ?? '';
    const lastName: string    = event.last_name ?? '';
    const fullName            = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];

    this.logger.log(`Novo usuário Clerk: ${clerkUserId} — ${email}`);

    // Evita duplicata
    const existing = await prisma.workspaceUser.findFirst({
      where: { clerkUserId },
    });
    if (existing) {
      this.logger.warn(`Workspace já existe para ${clerkUserId} — ignorando`);
      return { ok: true, skipped: true };
    }

    // Gera slug único
    const baseSlug = `escritorio-${fullName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}`;
    const slugExists = await prisma.workspace.findUnique({ where: { slug: baseSlug } });
    const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Trial: +14 dias
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Cria Workspace
    const workspace = await prisma.workspace.create({
      data: {
        name:        `Escritório de ${fullName}`,
        slug,
        clerkOrgId:  clerkUserId,
        trialEndsAt,
      },
    });

    this.logger.log(`Workspace criado: ${workspace.id} (${slug})`);

    // Cria WorkspaceUser como OWNER
    await prisma.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        clerkUserId,
        role:        'OWNER',
        isActive:    true,
      },
    });

    // Habilita 8 módulos padrão
    await Promise.all(
      DEFAULT_MODULES.map((moduleKey) =>
        prisma.workspaceModule.create({
          data: { workspaceId: workspace.id, moduleKey, isEnabled: true },
        }),
      ),
    );

    // ── NOVO Sprint 1: cria Subscription TRIAL ────────────────────────────
    await prisma.subscription.create({
      data: {
        workspaceId: workspace.id,
        plan:        'STARTER',
        status:      'TRIAL',
        trialEndsAt,
      },
    });

    this.logger.log(`Subscription TRIAL criada para workspace ${workspace.id}`);

    // E-mail de boas-vindas
    try {
      await this.jobsProducer.queueEmail({
        template:      'workspace-welcome',
        to:            email,
        recipientName: fullName,
        payload: {
          workspaceName: workspace.name,
          portalUrl:     `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'}/dashboard`,
        },
      });
    } catch (err) {
      this.logger.warn(`Falha ao enfileirar e-mail de boas-vindas: ${err.message}`);
    }

    return { ok: true, workspaceId: workspace.id, slug };
  }
}