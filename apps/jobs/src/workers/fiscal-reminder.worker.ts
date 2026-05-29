import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import {
  QUEUES,
  JOB_NAMES,
  DEFAULT_JOB_OPTIONS,
} from '@contahub/shared';
import type { SendEmailJobData, DeadlineAlertPayload } from '@contahub/shared';
import { WahaClientService } from '../services/waha-client.service';

const prisma = new PrismaClient();

const ALERT_DAYS_BEFORE = [7, 3, 1] as const;
const TZ = 'America/Sao_Paulo';

export interface FiscalAlertJobData {
  obligationId: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  obligationName: string;
  dueDate: string;
  daysUntilDue: number;
  amount: number | null;
  notificationChannels: string[];
}

@Injectable()
@Processor(QUEUES.FISCAL_REMINDERS)
export class FiscalReminderWorker extends WorkerHost {
  private readonly logger = new Logger(FiscalReminderWorker.name);

  constructor(
    // InjectQueue do @nestjs/bullmq — compatível com o BullModule.registerQueue
    @InjectQueue(QUEUES.FISCAL_REMINDERS)
    private readonly fiscalQueue: Queue,

    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,

    private readonly wahaService: WahaClientService,
  ) {
    super();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENDAMENTO: todo dia às 08h (horário de Brasília)
  // ──────────────────────────────────────────────────────────────────────────
  @Cron('0 11 * * *', { name: 'daily-fiscal-scan', timeZone: TZ })
  async scheduleDailyScan() {
    this.logger.log('╔══ Iniciando varredura diária de obrigações fiscais ══╗');

    const today = toZonedTime(new Date(), TZ);

    const targetDates = ALERT_DAYS_BEFORE.map((days) =>
      format(addDays(today, days), 'yyyy-MM-dd'),
    );

    this.logger.log(`Buscando obrigações para: ${targetDates.join(', ')}`);

    try {
      const obligations = await prisma.fiscalObligation.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: targetDates.map((d) => ({
            dueDate: {
              gte: new Date(d + 'T00:00:00.000Z'),
              lte: new Date(d + 'T23:59:59.999Z'),
            },
          })),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              portalEmail: true,
              workspaceId: true,
            },
          },
        },
      });

      this.logger.log(
        `${obligations.length} obrigação(ões) encontrada(s) para alertar`,
      );

      // Busca os canais de notificação de todos os workspaces envolvidos
      // em uma única query — evita N queries dentro do loop
      const workspaceIds = [...new Set(obligations.map((o) => o.client.workspaceId))];
      const workspaces = await prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: { id: true, name: true, notificationChannels: true },
      });
      const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

      let enqueued = 0;

      for (const obligation of obligations) {
        const workspace = workspaceMap.get(obligation.client.workspaceId);
        const channels: string[] = workspace?.notificationChannels ?? ['WHATSAPP'];

        const daysUntilDue = differenceInDays(obligation.dueDate, today);
        const dateLabel    = format(today, 'yyyy-MM-dd');

        // ── Canal WhatsApp ───────────────────────────────────────────────────
        if (channels.includes('WHATSAPP')) {
          if (!obligation.client.phone) {
            this.logger.warn(
              `${obligation.client.name} — WhatsApp ativo mas sem telefone, pulando`,
            );
          } else {
            const jobData: FiscalAlertJobData = {
              obligationId:         obligation.id,
              workspaceId:          obligation.client.workspaceId,
              clientId:             obligation.client.id,
              clientName:           obligation.client.name,
              clientPhone:          obligation.client.phone,
              clientEmail:          obligation.client.portalEmail ?? null,
              obligationName:       String(obligation.type),
              dueDate:              obligation.dueDate.toISOString(),
              daysUntilDue,
              amount:               obligation.amount ? Number(obligation.amount) : null,
              notificationChannels: channels,
            };

            await this.fiscalQueue.add(
              JOB_NAMES.SEND_FISCAL_ALERT,
              jobData,
              {
                ...DEFAULT_JOB_OPTIONS,
                jobId: `fiscal-whatsapp-${obligation.id}-${dateLabel}`,
              },
            );
            enqueued++;
          }
        }

        // ── Canal E-mail ─────────────────────────────────────────────────────
        if (channels.includes('EMAIL')) {
          if (!obligation.client.portalEmail) {
            this.logger.warn(
              `${obligation.client.name} — E-mail ativo mas sem portalEmail, pulando`,
            );
          } else {
            const emailJobData: SendEmailJobData = {
              template:      'deadline-alert',
              to:            obligation.client.portalEmail,
              recipientName: obligation.client.name,
              payload: {
                obligationType: String(obligation.type),
                clientName:     obligation.client.name,
                dueDate:        format(
                                  parseISO(obligation.dueDate.toISOString()),
                                  'dd/MM/yyyy',
                                  { locale: ptBR },
                                ),
                daysUntil:      daysUntilDue,
                workspaceName:  workspace?.name ?? 'Escritório Contábil',
              } as DeadlineAlertPayload,
            };

            await this.notificationsQueue.add(
              JOB_NAMES.SEND_EMAIL,
              emailJobData,
              {
                ...DEFAULT_JOB_OPTIONS,
                jobId: `fiscal-email-${obligation.id}-${dateLabel}`,
              },
            );
            enqueued++;
          }
        }
      }

      this.logger.log(`╚══ ${enqueued} alertas enfileirados com sucesso ══╝`);
    } catch (err) {
      this.logger.error('Erro na varredura diária:', err);
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESSOR: padrão @nestjs/bullmq — um único método process() com switch
  // BullMQ roteia pelo job.name, igual ao NotificationWorker
  // ──────────────────────────────────────────────────────────────────────────
  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.SEND_FISCAL_ALERT:
        return this.handleFiscalAlert(job as Job<FiscalAlertJobData>);
      case JOB_NAMES.DAILY_SCAN:
        return this.handleDailyScan(job);
      default:
        this.logger.warn(`Job name desconhecido: ${job.name}`);
        return null;
    }
  }

  private async handleFiscalAlert(job: Job<FiscalAlertJobData>) {
    const data = job.data;
    this.logger.log(
      `Processando alerta WhatsApp: ${data.clientName} — ${data.obligationName} (${data.daysUntilDue}d)`,
    );

    const dueDateFormatted = format(
      parseISO(data.dueDate),
      'EEEE, dd/MM/yyyy',
      { locale: ptBR },
    );

    const amountText = data.amount
      ? `\n💰 Valor: R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '';

    const urgencyEmoji =
      data.daysUntilDue === 1 ? '🚨' :
      data.daysUntilDue === 3 ? '⚠️' : '📅';

    const message = [
      `${urgencyEmoji} *Alerta Fiscal — ContaHub*`,
      ``,
      `Olá! Lembramos que a obrigação abaixo vence em *${data.daysUntilDue} dia(s)*:`,
      ``,
      `📋 *${data.obligationName}*`,
      `📅 Vencimento: ${dueDateFormatted}`,
      amountText,
      ``,
      `Acesse o portal para mais detalhes ou entre em contato com seu contador.`,
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    const result = await this.wahaService.sendText({
      chatId: data.clientPhone!,
      text: message,
    });

    if (!result.success) {
      throw new Error(`Falha ao enviar WhatsApp: ${result.error}`);
    }

    this.logger.log(
      `✓ WhatsApp enviado para ${data.clientName} — msgId: ${result.messageId}`,
    );

    return { sent: true, channel: 'whatsapp', messageId: result.messageId };
  }

  private async handleDailyScan(job: Job) {
    this.logger.log(`Varredura manual iniciada (job ${job.id})`);
    await this.scheduleDailyScan();
    return { triggered: true };
  }
// ──────────────────────────────────────────────────────────────────────────
  // AGENDAMENTO: varredura semanal de CNPJs — toda segunda às 07h (BRT)
  // "0 10 * * 1" = 10h UTC = 07h BRT, somente segunda-feira (1)
  // ──────────────────────────────────────────────────────────────────────────
  @Cron('0 10 * * 1', { name: 'weekly-cnpj-scan', timeZone: TZ })
  async scheduleWeeklyCnpjScan() {
    this.logger.log('╔══ Iniciando varredura semanal de CNPJs ══╝');

    try {
      const workspaces = await prisma.workspace.findMany({
        select: { id: true, name: true },
      });

      this.logger.log(`${workspaces.length} workspace(s) para varrer`);

      let totalAlertas = 0;

      for (const workspace of workspaces) {
        const clients = await prisma.client.findMany({
          where: {
            workspaceId: workspace.id,
            status: 'ACTIVE',
            cnpj: { not: '' },
          },
          select: { id: true, cnpj: true, name: true },
        });

        this.logger.log(
          `Workspace "${workspace.name}" — ${clients.length} cliente(s)`,
        );

        for (const client of clients) {
          try {
            // Delay de 400ms entre consultas — respeita rate limit da BrasilAPI
            await new Promise((res) => setTimeout(res, 400));

            const cnpjLimpo = client.cnpj.replace(/\D/g, '');
            const response  = await fetch(
              `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
            );

            let status      = 'NAO_ENCONTRADO';
            let razaoSocial = '';
            let situacao    = 'CNPJ não encontrado na Receita Federal';

            if (response.ok) {
              const data  = await response.json();
              status      = (data.descricao_situacao_cadastral ?? 'DESCONHECIDA').toUpperCase().trim();
              razaoSocial = data.razao_social ?? '';
              situacao    = data.descricao_situacao_cadastral ?? '';
            }

            await prisma.cnpjConsultation.create({
              data: {
                workspaceId: workspace.id,
                clientId:    client.id,
                cnpj:        cnpjLimpo,
                status,
                razaoSocial,
                situacao,
              },
            });

            await prisma.client.update({
              where: { id: client.id },
              data:  { cnpjStatus: status, cnpjLastChecked: new Date() },
            });

            const ALERT_STATUSES = ['INAPTA', 'BAIXADA', 'SUSPENSA', 'NULA', 'NAO_ENCONTRADO'];
            if (ALERT_STATUSES.includes(status)) {
              totalAlertas++;
              this.logger.warn(
                `⚠️  ${client.name} — CNPJ ${cnpjLimpo} com status: ${status}`,
              );
            }
          } catch (err) {
            this.logger.error(
              `Erro ao consultar CNPJ de ${client.name}: ${err.message}`,
            );
          }
        }
      }

      this.logger.log(
        `╚══ Varredura semanal concluída — ${totalAlertas} alertas encontrados ══╝`,
      );
    } catch (err) {
      this.logger.error('Erro na varredura semanal de CNPJs:', err);
      throw err;
    }
  }
}