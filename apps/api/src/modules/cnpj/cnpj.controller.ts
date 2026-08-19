import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { CnpjService } from './cnpj.service';
import { JobsProducerService } from '../jobs/jobs-producer.service';

@Controller('cnpj')
export class CnpjController {
  constructor(
    private readonly cnpjService: CnpjService,
    private readonly jobsProducer: JobsProducerService,
  ) {}

  // ── Varredura manual de todos os clientes do workspace ────────────────────
  // POST /api/v1/cnpj/varrer
  // Assíncrono: enfileira o job e responde imediatamente, evitando timeout
  // de gateway/proxy quando o workspace tem muitos clientes (rate limit da
  // ReceitaWS exige 20s de intervalo entre consultas).
  @Post('varrer')
  @HttpCode(HttpStatus.OK)
  async varrer(
    @Req() req: Request & { workspaceId: string },
  ) {
    const jobId = await this.jobsProducer.queueCnpjScan(req.workspaceId);

    return {
      data:    { jobId },
      message: 'Varredura de CNPJ iniciada em segundo plano. Isso pode levar alguns minutos, dependendo do número de clientes.',
    };
  }

  // ── Status/progresso de uma varredura em andamento ─────────────────────────
  // GET /api/v1/cnpj/varrer/status/:jobId
  // Rota declarada antes das rotas com parâmetro genérico (:cnpj, :clientId)
  // para evitar ambiguidade de matching de rota no NestJS.
  @Get('varrer/status/:jobId')
  async getVarrerStatus(@Param('jobId') jobId: string) {
    return this.jobsProducer.getCnpjScanStatus(jobId);
  }

  // ── Consulta situação cadastral de um CNPJ ────────────────────────────────
  // GET /api/v1/cnpj/:cnpj/status?clientId=xxx
  // Chamado pelo frontend ao abrir a página de clientes ou ao clicar em "Verificar"
  @Get(':cnpj/status')
  async getStatus(
    @Param('cnpj') cnpj: string,
    @Req() req: Request & { workspaceId: string },
  ) {
    // clientId vem como query param: ?clientId=cmp9tzp...
    const clientId = (req.query.clientId as string) ?? '';

    const result = await this.cnpjService.consultarStatus(
      cnpj,
      clientId,
      req.workspaceId,
    );

    return {
      data:    result,
      message: result.hasAlert
        ? `⚠️ CNPJ com situação ${result.status} na Receita Federal`
        : `CNPJ com situação ${result.status}`,
    };
  }

  // ── Histórico de consultas de um cliente ──────────────────────────────────
  // GET /api/v1/cnpj/:clientId/historico
  @Get(':clientId/historico')
  async getHistorico(
    @Param('clientId') clientId: string,
    @Req() req: Request & { workspaceId: string },
  ) {
    const historico = await this.cnpjService.getHistorico(
      clientId,
      req.workspaceId,
    );

    return { data: historico };
  }

  // GET /api/v1/cnpj/:cnpj/lookup
  @Get(':cnpj/lookup')
  async getLookup(
    @Param('cnpj') cnpj: string,
  ) {
    const result = await this.cnpjService.lookup(cnpj);
    return { data: result };
  }
}