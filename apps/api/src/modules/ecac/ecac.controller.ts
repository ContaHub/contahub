import { Controller, Post, Get, Param, Req } from '@nestjs/common';
import { EcacService } from './ecac.service';

@Controller('ecac')
export class EcacController {
  constructor(private readonly ecacService: EcacService) {}

  /**
   * POST /api/v1/ecac/:clientId/consultar
   * Dispara consulta imediata no e-CAC para um cliente específico.
   */
  @Post(':clientId/consultar')
  async triggerConsulta(@Param('clientId') clientId: string, @Req() req: any) {
    return this.ecacService.triggerConsulta(req.workspaceId, clientId);
  }

  /**
   * GET /api/v1/ecac/:clientId/resultado
   * Retorna o último resultado de consulta e-CAC do cliente.
   */
  @Get(':clientId/resultado')
  async getResultado(@Param('clientId') clientId: string, @Req() req: any): Promise<any> {
    return this.ecacService.getResultado(req.workspaceId, clientId);
  }

  /**
   * GET /api/v1/ecac/pendencias
   * Lista todos os clientes com pendências ativas na Receita Federal.
   */
  @Get('pendencias')
  async getPendencias(@Req() req: any) {
    return this.ecacService.getPendencias(req.workspaceId);
  }

  /**
   * GET /api/v1/ecac/:clientId/historico
   * Últimas 10 consultas e-CAC de um cliente.
   */
  @Get(':clientId/historico')
  async getHistorico(@Param('clientId') clientId: string, @Req() req: any): Promise<any> {
    return this.ecacService.getHistorico(req.workspaceId, clientId);
  }
}
