import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { JobsModule } from '../jobs/jobs.module';
import { WebhookAsaasController } from './webhook-asaas.controller';
import { ConfigModule } from '@nestjs/config';
import { WahaWebhookController } from './waha-webhook.controller';

@Module({
  imports: [JobsModule, ConfigModule],   // ← expõe JobsProducerService via injeção de dependência
  controllers: [WebhookController, WebhookAsaasController, WahaWebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}