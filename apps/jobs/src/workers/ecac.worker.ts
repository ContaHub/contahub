import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@contahub/database';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { QUEUES, JOB_NAMES } from '@contahub/shared';
import { EcacBrowserService } from '../services/ecac-browser.service';

/**
 * Dado de um job de consulta e-CAC
 */
interface EcacConsultJobData {
  clientId: string;
  clientName: string;
  workspaceId: string;
}

/**
 * EcacWorker
 *
 * Responsabilidades:
 * 1. CRON toda segunda-feira às 03h BRT (06h UTC) — varre todos os
 *    clientes com certificado válido e enfileira jobs de consulta
 * 2. Processa cada job: baixa .pfx do Supabase, descriptografa,
 *    roda o EcacBrowserService, salva resultado no banco
 * 3. Notifica o contador se encontrar pendências novas
 *
 * DEDUPLICAÇÃO:
 * - Cada job tem jobId único por clientId + semana
 * - Hash do conteúdo comparado com a última consulta — só notifica se mudou
 *
 * RATE LIMITING:
 * - Delay de 30s entre jobs (evita bloqueio de IP pelo e-CAC)
 * - Máximo de 20 clientes por execução do cron
 */
@Injectable()
@Processor(QUEUES.ECAC)
export class EcacWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EcacWorker.name);
  private readonly prisma = new PrismaClient();

  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(
    @InjectQueue(QUEUES.ECAC) private readonly ecacQueue: Queue,
    private readonly ecacBrowser: EcacBrowserService,
  ) {
    super();
  }

  onModuleInit() {
    this.logger.log('EcacWorker → ativo (cron: toda segunda 03h BRT)');
  }

  // ─── CRON: toda segunda-feira às 06h UTC (03h BRT) ────────────────────────

  @Cron('0 6 * * 1') // segundas, 06h UTC
  async agendarConsultasSemanal() {
    this.logger.log('=== Iniciando varredura semanal e-CAC ===');

    const certificados = await this.prisma.clientCertificate.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        client: { select: { id: true, name: true, workspaceId: true } },
      },
      take: 20, // máximo 20 clientes por rodada
    });

    this.logger.log(`${certificados.length} cliente(s) com certificado válido encontrado(s)`);

    for (let i = 0; i < certificados.length; i++) {
      const cert = certificados[i];
      const semana = this.getSemanaISO();
      const jobId = `ecac-${cert.clientId}-${semana}`;

      await this.ecacQueue.add(
        JOB_NAMES.ECAC_CONSULT,
        {
          clientId: cert.clientId,
          clientName: cert.client.name,
          workspaceId: cert.client.workspaceId,
        } as EcacConsultJobData,
        {
          jobId,           // deduplicação — não enfileira o mesmo cliente 2x na mesma semana
          delay: i * 30_000, // 30s entre cada cliente
          attempts: 2,
          backoff: { type: 'fixed', delay: 300_000 }, // retry após 5min
        },
      );

      this.logger.debug(`Job enfileirado: ${jobId}`);
    }

    this.logger.log(`=== ${certificados.length} job(s) enfileirado(s) ===`);
  }

  // ─── Trigger manual (chamado pelo EcacController) ─────────────────────────

  async enfileirarClienteImediato(clientId: string): Promise<string> {
    const cert = await this.prisma.clientCertificate.findUnique({
      where: { clientId },
      include: { client: { select: { name: true, workspaceId: true } } },
    });

    if (!cert) throw new Error('Cliente não possui certificado cadastrado');
    if (cert.status !== 'ACTIVE') throw new Error('Certificado não está ativo');

    const jobId = `ecac-manual-${clientId}-${Date.now()}`;

    await this.ecacQueue.add(
      JOB_NAMES.ECAC_CONSULT,
      {
        clientId,
        clientName: cert.client.name,
        workspaceId: cert.client.workspaceId,
      } as EcacConsultJobData,
      { jobId, attempts: 1 },
    );

    this.logger.log(`Consulta manual enfileirada para ${cert.client.name} (${jobId})`);
    return jobId;
  }

  // ─── Processamento do job ─────────────────────────────────────────────────

  async process(job: Job<EcacConsultJobData>) {
    const { clientId, clientName, workspaceId } = job.data;
    this.logger.log(`[${clientName}] Iniciando consulta e-CAC...`);

    // 1. Buscar certificado no banco
    const cert = await this.prisma.clientCertificate.findUnique({
      where: { clientId },
    });

    if (!cert) {
      this.logger.warn(`[${clientName}] Certificado não encontrado — pulando`);
      return;
    }

    // 2. Buscar a senha decriptada do .pfx
    //    NOTA: A senha está armazenada como hash bcrypt — precisamos da senha
    //    original para passar ao Playwright. Como não podemos reverter bcrypt,
    //    o EcacWorker recebe a senha via variável de ambiente do workspace
    //    OU o contador precisa re-informar a senha para consultas automáticas.
    //    Por ora, usamos a senha do ambiente (.env) como fallback de desenvolvimento.
    //    Em produção, implementar cofre de senhas (ex: Vault, AWS Secrets Manager).
    const pfxPassword = process.env.ECAC_TEST_PASSWORD || '';

    if (!pfxPassword) {
      this.logger.warn(`[${clientName}] Senha do certificado não configurada — pulando`);
      // Registrar falha no banco
      await this.salvarResultado(clientId, workspaceId, false, [], null,
        'Senha do certificado não configurada para consulta automática');
      return;
    }

    // 3. Baixar e descriptografar o .pfx do Supabase
    let pfxBuffer: Buffer;
    try {
      pfxBuffer = await this.baixarPfx(cert.storageKey);
    } catch (err: any) {
      this.logger.error(`[${clientName}] Erro ao baixar .pfx: ${err.message}`);
      await this.salvarResultado(clientId, workspaceId, false, [], null,
        `Erro ao baixar certificado: ${err.message}`);
      return;
    }

    // 4. Rodar o EcacBrowserService
    const resultado = await this.ecacBrowser.consultarPendencias(
      pfxBuffer, pfxPassword, clientName
    );

    // 5. Verificar deduplicação — só notifica se o conteúdo mudou
    const ultimaConsulta = await this.prisma.ecacConsultation.findFirst({
      where: { clientId },
      orderBy: { consultedAt: 'desc' },
    });

    const conteudoMudou = !ultimaConsulta || ultimaConsulta.contentHash !== resultado.contentHash;

    // 6. Salvar resultado no banco
    const consultation = await this.salvarResultado(
      clientId, workspaceId,
      resultado.success,
      resultado.pendencies,
      resultado.contentHash ?? null,
      resultado.errorMessage,
    );

    // 7. Atualizar campos de cache no Client
    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        ecacLastChecked: new Date(),
        ecacAlertCount: resultado.pendencies.length,
      },
    });

    // 8. Notificar contador se há pendências novas
    if (resultado.success && resultado.pendencies.length > 0 && conteudoMudou) {
      this.logger.warn(
        `[${clientName}] ${resultado.pendencies.length} pendência(s) nova(s) — notificando contador`
      );
      // TODO Sprint 5: enfileirar notificação WhatsApp/e-mail para o contador
    }

    this.logger.log(
      `[${clientName}] Consulta salva — sucesso: ${resultado.success}, ` +
      `pendências: ${resultado.pendencies.length}, conteúdo mudou: ${conteudoMudou}`
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async baixarPfx(storageKey: string): Promise<Buffer> {
    const bucket = process.env.SUPABASE_CERTIFICATES_BUCKET || 'certificates';

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(storageKey);

    if (error || !data) throw new Error(`Supabase error: ${error?.message}`);

    const encryptedBuffer = Buffer.from(await data.arrayBuffer());

    // Descriptografar AES-256-CBC
    const key = process.env.CERTIFICATE_ENCRYPTION_KEY!;
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = encryptedBuffer.subarray(0, 16);
    const encrypted = encryptedBuffer.subarray(16);

    const crypto = await import('crypto');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private async salvarResultado(
    clientId: string,
    workspaceId: string,
    success: boolean,
    pendencies: any[],
    contentHash: string | null,
    errorMessage?: string,
  ) {
    const status = success ? 'SUCCESS' : 'FAILED';

    const consultation = await this.prisma.ecacConsultation.create({
      data: {
        clientId,
        workspaceId,
        status: status as any,
        contentHash,
        errorMessage,
        pendencies: {
          create: pendencies.map((p) => ({
            clientId,
            workspaceId,
            type: p.type as any,
            description: p.description,
            amount: p.amount ? p.amount / 100 : undefined, // centavos → reais para Decimal
            dueDate: p.dueDate,
            situation: p.situation,
          })),
        },
      },
    });

    return consultation;
  }

  /** Retorna o número ISO da semana atual (ex: "2026-W22") */
  private getSemanaISO(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
