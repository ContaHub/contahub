import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaClient } from '@contahub/database';
import { QUEUES, JOB_NAMES } from '@contahub/shared';

@Injectable()
export class EcacService {
  private readonly prisma = new PrismaClient();

  constructor(
    @InjectQueue(QUEUES.ECAC) private readonly ecacQueue: Queue,
  ) {}

  /** Dispara consulta imediata para um cliente */
  async triggerConsulta(workspaceId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId },
      include: { certificate: true },
    });

    if (!client) throw new NotFoundException('Cliente não encontrado');
    if (!client.certificate) {
      throw new NotFoundException('Cliente não possui certificado digital cadastrado');
    }
    if (client.certificate.status !== 'ACTIVE') {
      throw new NotFoundException('Certificado do cliente não está ativo');
    }

    const jobId = `ecac-manual-${clientId}-${Date.now()}`;

    await this.ecacQueue.add(
      JOB_NAMES.ECAC_CONSULT,
      { clientId, clientName: client.name, workspaceId },
      { jobId, attempts: 1 },
    );

    return {
      data: { jobId, clientId, clientName: client.name },
      message: `Consulta e-CAC enfileirada para ${client.name}`,
    };
  }

  /** Retorna o último resultado de consulta de um cliente */
  async getResultado(workspaceId: string, clientId: string): Promise<any> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const consulta = await this.prisma.ecacConsultation.findFirst({
      where: { clientId, workspaceId },
      orderBy: { consultedAt: 'desc' },
      include: {
        pendencies: { orderBy: { createdAt: 'asc' } },
      },
    });

    return {
      data: {
        client: { id: client.id, name: client.name, ecacLastChecked: client.ecacLastChecked, ecacAlertCount: client.ecacAlertCount },
        consulta: consulta ?? null,
      },
    };
  }

  /** Lista todos os clientes do workspace com pendências ativas */
  async getPendencias(workspaceId: string) {
    const clients = await this.prisma.client.findMany({
      where: { workspaceId, ecacAlertCount: { gt: 0 } },
      select: {
        id: true, name: true, cnpj: true,
        ecacLastChecked: true, ecacAlertCount: true,
      },
      orderBy: { ecacAlertCount: 'desc' },
    });

    return {
      data: clients,
      meta: { total: clients.length },
    };
  }

  /** Histórico de consultas de um cliente */
  async getHistorico(workspaceId: string, clientId: string): Promise<any> {
    const consultas = await this.prisma.ecacConsultation.findMany({
      where: { clientId, workspaceId },
      orderBy: { consultedAt: 'desc' },
      take: 10,
      include: { pendencies: true },
    });

    return { data: consultas };
  }
}
