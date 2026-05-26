/**
 * JobsProducerService — enfileira jobs para o apps/jobs processar
 *
 * Regra fundamental: a API PRODUZ, o apps/jobs CONSOME.
 * Nunca instanciar Resend ou WAHA aqui — apenas enfileirar no Redis.
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  QUEUES,
  JOB_NAMES,
  type SendWhatsappJobData,
  type SendEmailJobData,
} from "@contahub/shared";

@Injectable()
export class JobsProducerService {
  private readonly logger = new Logger(JobsProducerService.name);

  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QUEUES.FISCAL_REMINDERS) private fiscalQueue: Queue
  ) {}

  // ── WhatsApp ───────────────────────────────────────────────────────────────

  async queueWhatsApp(data: SendWhatsappJobData): Promise<void> {
    await this.notificationsQueue.add(JOB_NAMES.SEND_WHATSAPP, data);
    this.logger.log(`WhatsApp enfileirado para ${data.phone}`);
  }

  // ── E-mail ─────────────────────────────────────────────────────────────────

  async queueEmail(data: SendEmailJobData): Promise<string> {
    const job = await this.notificationsQueue.add(JOB_NAMES.SEND_EMAIL, data, {
      jobId: `email-${data.template}-${data.to}-${Date.now()}`,
    });
    this.logger.log(`E-mail [${data.template}] enfileirado para ${data.to} — job: ${job.id}`);
    return job.id as string;
  }

  // ── Notificação de conclusão de obrigação ──────────────────────────────────
  // Respeita notificationChannels do workspace — envia WhatsApp e/ou e-mail

  async queueCompletionNotice(params: {
    phone?: string;
    email?: string;
    recipientName: string;
    obligationType: string;
    clientName: string;
    workspaceName: string;
    accountantName: string;
    channels: string[];
  }): Promise<void> {
    // [FIX-02] let + reatribuição para que a variável reflita o replace
    let completedAt = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date());
    completedAt = completedAt.replace(",", " às");

    if (params.channels.includes("WHATSAPP") && params.phone) {
      await this.queueWhatsApp({
        phone: params.phone,
        message:
          `Obrigacao concluida\n\n` +
          `${params.obligationType} de *${params.clientName}* ` +
          `foi processada em ${completedAt}.\n\nAtt, ${params.workspaceName}`,
      });
    }

    if (params.channels.includes("EMAIL") && params.email) {
      await this.queueEmail({
        template: "obligation-completed",
        to: params.email,
        recipientName: params.recipientName,
        payload: {
          obligationType: params.obligationType,
          clientName: params.clientName,
          completedAt,
          workspaceName: params.workspaceName,
          accountantName: params.accountantName,
        },
      });
    }
  }

  // ── Boas-vindas ao portal ──────────────────────────────────────────────────

  async queuePortalWelcome(params: {
    email: string;
    recipientName: string;
    workspaceName: string;
    portalUrl: string;
  }): Promise<void> {
    await this.queueEmail({
      template: "portal-welcome",
      to: params.email,
      recipientName: params.recipientName,
      payload: {
        workspaceName: params.workspaceName,
        portalUrl: params.portalUrl,
      },
    });
  }

  // ── Varredura fiscal manual ────────────────────────────────────────────────

  async triggerFiscalScan(): Promise<string> {
    const job = await this.fiscalQueue.add(
      JOB_NAMES.SCAN_FISCAL_OBLIGATIONS,
      { triggeredAt: new Date().toISOString() },
      { jobId: `manual-scan-${Date.now()}` }
    );
    return job.id as string;
  }
}
