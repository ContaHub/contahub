import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@contahub/shared';
import { JobsProducerService } from './jobs-producer.service';
import { JobsController } from './jobs.controller';
import { PortalNoticesService } from "./portal-notices.service";

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
  providers: [JobsProducerService, PortalNoticesService],
  controllers: [JobsController],
  exports:   [JobsProducerService, PortalNoticesService],

})
export class JobsModule {}
