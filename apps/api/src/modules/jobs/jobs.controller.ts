import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JobsProducerService } from './jobs-producer.service';

/**
 * Endpoints administrativos para gerenciar jobs manualmente.
 * Úteis para testes e para forçar uma varredura sem esperar o cron.
 *
 * Todos protegidos pelo WorkspaceMiddleware (token Clerk obrigatório).
 */
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsProducerService: JobsProducerService) {}

  /**
   * POST /api/v1/jobs/fiscal-scan
   * Dispara uma varredura imediata de alertas fiscais.
   * Retorna 202 Accepted com o ID do job enfileirado.
   */
  @Post('fiscal-scan')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerFiscalScan() {
    const result = await this.jobsProducerService.triggerFiscalScan();
    return {
      data: result,
      message: 'Varredura fiscal enfileirada. Verifique o Bull Board para acompanhar.',
    };
  }
}
