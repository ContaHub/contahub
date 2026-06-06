import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@contahub/database';

const prisma = new PrismaClient();

// Situações que geram alerta no dashboard
export const CNPJ_ALERT_STATUSES = ['INAPTA', 'BAIXADA', 'SUSPENSA', 'NULA'];

export interface CnpjStatusResult {
  cnpj:        string;
  status:      string;   // "ATIVA", "INAPTA", "BAIXADA", "SUSPENSA", "NULA"
  razaoSocial: string;
  situacao:    string;   // descrição completa da Receita Federal
  consultedAt: string;   // ISO string
  hasAlert:    boolean;  // true se status for crítico
}

@Injectable()
export class CnpjService {
  private readonly logger = new Logger(CnpjService.name);

  // ──────────────────────────────────────────────────────────────────────────
  // Consulta situação cadastral de um CNPJ via BrasilAPI
  // Salva no histórico e atualiza o campo cnpjStatus do cliente
  // ──────────────────────────────────────────────────────────────────────────
  async consultarStatus(
    cnpj: string,
    clientId: string,
    workspaceId: string,
  ): Promise<CnpjStatusResult> {
    // Remove caracteres especiais: "11.222.333/0001-44" → "11222333000144"
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    this.logger.log(`Consultando CNPJ ${cnpjLimpo} via BrasilAPI`);

    // Consulta a BrasilAPI — gratuita, sem autenticação, até 3 req/s
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
    );

    if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
        // CNPJ não encontrado ou inválido na Receita Federal
        // Salva como "NÃO ENCONTRADO" no histórico em vez de quebrar
        await prisma.cnpjConsultation.create({
        data: {
            workspaceId,
            clientId,
            cnpj:       cnpjLimpo,
            status:     'NÃO ENCONTRADO',
            razaoSocial: '',
            situacao:   'CNPJ não encontrado na Receita Federal',
        },
        });

        await prisma.client.update({
        where: { id: clientId },
        data: {
            cnpjStatus:      'NÃO ENCONTRADO',
            cnpjLastChecked: new Date(),
        },
        });

        return {
        cnpj:        cnpjLimpo,
        status:      'NÃO ENCONTRADO',
        razaoSocial: '',
        situacao:    'CNPJ não encontrado na Receita Federal',
        consultedAt: new Date().toISOString(),
        hasAlert:    true,
        };
    }
    throw new Error(`BrasilAPI retornou status ${response.status}`);
    }

    const data = await response.json();

    // BrasilAPI retorna "descricao_situacao_cadastral": "ATIVA", "INAPTA", etc.
    const status: string = (
      data.descricao_situacao_cadastral ?? 'DESCONHECIDA'
    ).toUpperCase().trim();

    const razaoSocial: string = data.razao_social ?? '';
    const situacao:    string = data.descricao_situacao_cadastral ?? '';

    // Salva no histórico de consultas
    await prisma.cnpjConsultation.create({
      data: {
        workspaceId,
        clientId,
        cnpj:       cnpjLimpo,
        status,
        razaoSocial,
        situacao,
      },
    });

    // Atualiza o campo rápido no Client para exibir o badge sem query extra
    await prisma.client.update({
      where: { id: clientId },
      data: {
        cnpjStatus:      status,
        cnpjLastChecked: new Date(),
      },
    });

    this.logger.log(`CNPJ ${cnpjLimpo} — status: ${status}`);

    return {
      cnpj:        cnpjLimpo,
      status,
      razaoSocial,
      situacao,
      consultedAt: new Date().toISOString(),
      hasAlert:    CNPJ_ALERT_STATUSES.includes(status),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Retorna o histórico de consultas de um cliente
  // ──────────────────────────────────────────────────────────────────────────
  async getHistorico(
    clientId: string,
    workspaceId: string,
  ) {
    return prisma.cnpjConsultation.findMany({
      where:   { clientId, workspaceId },
      orderBy: { consultedAt: 'desc' },
      take:    10, // últimas 10 consultas
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Varre todos os clientes ativos do workspace e atualiza o status
  // Chamado pelo worker semanal (Passo 6)
  // ──────────────────────────────────────────────────────────────────────────
  async varrerWorkspace(workspaceId: string): Promise<{
    total: number;
    alertas: number;
    erros: number;
  }> {
    const clients = await prisma.client.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        cnpj:   { not: '' },
      },
      select: { id: true, cnpj: true, tradeName: true },
    });

    this.logger.log(
      `Varrendo ${clients.length} cliente(s) do workspace ${workspaceId}`,
    );

    let alertas = 0;
    let erros   = 0;

    for (const client of clients) {
      try {
        // Delay de 400ms entre consultas para respeitar rate limit da BrasilAPI
        await new Promise((res) => setTimeout(res, 400));

        const result = await this.consultarStatus(
          client.cnpj,
          client.id,
          workspaceId,
        );

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
    }

    this.logger.log(
      `Varredura concluída — ${clients.length} consultados, ${alertas} alertas, ${erros} erros`,
    );

    return { total: clients.length, alertas, erros };
  }
}