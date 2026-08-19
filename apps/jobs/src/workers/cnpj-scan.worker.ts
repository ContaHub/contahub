import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QUEUES, JOB_NAMES } from '@contahub/shared';

const prisma = new PrismaClient();

// Situações que geram alerta no dashboard
const CNPJ_ALERT_STATUSES = ['INAPTA', 'BAIXADA', 'SUSPENSA', 'NULA'];

// ReceitaWS API pública: limite de 3 consultas por minuto (1 a cada 20s)
const DELAY_BETWEEN_CONSULTATIONS_MS = 20_000;

export interface CnpjScanJobData {
  workspaceId: string;
}

/**
 * CnpjScanWorker
 *
 * Processa a varredura de situação cadastral de CNPJ de todos os clientes
 * de um workspace, respeitando o rate limit da API pública da ReceitaWS
 * (3 consultas/minuto — 1 a cada 20 segundos).
 *
 * Por que em fila, e não síncrono na rota HTTP?
 * Um workspace com N clientes levaria N × 20s para concluir a varredura.
 * Rodando síncrono numa rota HTTP, isso estouraria qualquer timeout de
 * gateway/proxy (Vercel, Nginx, Cloudflare costumam cortar entre 10-60s).
 * Rodando em fila, a rota apenas enfileira e responde imediatamente; o
 * progresso pode ser consultado via GET /cnpj/varrer/status.
 */
@Injectable()
@Processor(QUEUES.CNPJ_SCAN)
export class CnpjScanWorker extends WorkerHost {
  private readonly logger = new Logger(CnpjScanWorker.name);

  constructor(
    @InjectQueue(QUEUES.CNPJ_SCAN)
    private readonly cnpjScanQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<CnpjScanJobData>): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.CNPJ_SCAN_WORKSPACE:
        return this.handleScanWorkspace(job);
      default:
        this.logger.warn(`Job name desconhecido: ${job.name}`);
        return null;
    }
  }

  private async handleScanWorkspace(job: Job<CnpjScanJobData>) {
    const { workspaceId } = job.data;

    const clients = await prisma.client.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        cnpj: { not: '' },
      },
      select: { id: true, cnpj: true, tradeName: true },
    });

    this.logger.log(
      `[${job.id}] Varrendo ${clients.length} cliente(s) do workspace ${workspaceId}`,
    );

    let alertas = 0;
    let erros = 0;
    let processados = 0;

    for (const client of clients) {
      try {
        const result = await this.consultarStatus(client.cnpj, client.id, workspaceId);

        if (result.hasAlert) {
          alertas++;
          this.logger.warn(
            `⚠️  ${client.tradeName} — CNPJ ${result.cnpj} com status: ${result.status}`,
          );
        }
      } catch (err) {
        erros++;
        this.logger.error(`Erro ao consultar ${client.tradeName}: ${err.message}`);
      }

      processados++;
      // Atualiza progresso do job — pode ser consultado via getState()/progress
      await job.updateProgress(Math.round((processados / clients.length) * 100));

      // Respeita rate limit da ReceitaWS (3 consultas/minuto) — só espera
      // se ainda houver clientes na fila, evita delay desnecessário no fim
      if (processados < clients.length) {
        await new Promise((res) => setTimeout(res, DELAY_BETWEEN_CONSULTATIONS_MS));
      }
    }

    this.logger.log(
      `[${job.id}] Varredura concluída — ${clients.length} consultados, ${alertas} alertas, ${erros} erros`,
    );

    return { total: clients.length, alertas, erros };
  }

  private async consultarStatus(cnpj: string, clientId: string, workspaceId: string) {
    const cnpjLimpo = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);

    if (!response.ok) {
      if (response.status === 400 || response.status === 404 || response.status === 403) {
        await prisma.cnpjConsultation.create({
          data: {
            workspaceId,
            clientId,
            cnpj: cnpjLimpo,
            status: 'NÃO ENCONTRADO',
            razaoSocial: '',
            situacao: 'CNPJ não encontrado na Receita Federal',
          },
        });
        await prisma.client.update({
          where: { id: clientId },
          data: { cnpjStatus: 'NÃO ENCONTRADO', cnpjLastChecked: new Date() },
        });
        return {
          cnpj: cnpjLimpo,
          status: 'NÃO ENCONTRADO',
          hasAlert: true,
        };
      }
      throw new Error(`ReceitaWS retornou status ${response.status}`);
    }

    const data = await response.json();
    const status: string = (data.situacao ?? 'DESCONHECIDA').toUpperCase().trim();
    const razaoSocial: string = data.nome ?? '';
    const situacao: string = data.situacao ?? '';

    await prisma.cnpjConsultation.create({
      data: { workspaceId, clientId, cnpj: cnpjLimpo, status, razaoSocial, situacao },
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { cnpjStatus: status, cnpjLastChecked: new Date() },
    });

    return {
      cnpj: cnpjLimpo,
      status,
      hasAlert: CNPJ_ALERT_STATUSES.includes(status),
    };
  }
}