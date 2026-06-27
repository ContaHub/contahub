import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],   // ← expõe JobsProducerService via injeção de dependência
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}