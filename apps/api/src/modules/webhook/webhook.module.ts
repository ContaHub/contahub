import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { JobsModule } from '../jobs/jobs.module';
import { WebhookAsaasController } from './webhook-asaas.controller';

@Module({
  imports: [JobsModule],   // ← expõe JobsProducerService via injeção de dependência
  controllers: [WebhookController, WebhookAsaasController],
  providers: [WebhookService],
})
export class WebhookModule {}