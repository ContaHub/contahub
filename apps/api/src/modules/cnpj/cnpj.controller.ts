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

@Controller('cnpj')
export class CnpjController {
  constructor(private readonly cnpjService: CnpjService) {}

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

  // ── Varredura manual de todos os clientes do workspace ────────────────────
  // POST /api/v1/cnpj/varrer
  @Post('varrer')
  @HttpCode(HttpStatus.OK)
  async varrer(
    @Req() req: Request & { workspaceId: string },
  ) {
    const result = await this.cnpjService.varrerWorkspace(req.workspaceId);

    return {
      data:    result,
      message: `Varredura concluída — ${result.total} CNPJs verificados, ${result.alertas} alertas encontrados`,
    };
  }
}