import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { JobsModule } from './jobs.module';

const logger = new Logger('JobsApp');

async function bootstrap() {
  /**
   * Cria aplicação NestJS em modo standalone (sem servidor HTTP).
   * Os workers BullMQ e os schedulers @Cron ficam ativos enquanto
   * o processo estiver rodando — independente de requisições HTTP.
   */
  const app = await NestFactory.createApplicationContext(JobsModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Garante shutdown gracioso: drena filas antes de encerrar o processo
  app.enableShutdownHooks();

  logger.log('╔══════════════════════════════════════╗');
  logger.log('║   ContaHub Jobs — Workers ativos     ║');
  logger.log('╠══════════════════════════════════════╣');
  logger.log('║  FiscalReminderWorker  → ativo        ║');
  logger.log('║  NotificationWorker   → ativo        ║');
  logger.log('║  DocumentWorker       → ativo        ║');
  logger.log('║  Bull Board           → porta 3003   ║');
  logger.log('╚══════════════════════════════════════╝');
}

bootstrap().catch((err) => {
  logger.error('Falha ao iniciar jobs:', err);
  process.exit(1);
});
