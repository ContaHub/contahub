import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@contahub/shared';
import { JobsProducerService } from './jobs-producer.service';
import { JobsController } from './jobs.controller';

/**
 * Módulo de jobs no contexto da API.
 * Apenas registra as filas como PRODUTORAS — não registra workers/processors.
 * O consumo acontece no apps/jobs (processo separado).
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.FISCAL_REMINDERS },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.DOCUMENTS },
      { name: QUEUES.ECAC },
      { name: QUEUES.CNPJ_SCAN },
    ),
  ],
  providers: [JobsProducerService],
  controllers: [JobsController],
  exports: [JobsProducerService],
})
export class JobsModule {}
