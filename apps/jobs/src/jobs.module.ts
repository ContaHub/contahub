import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUES } from "@contahub/shared";
import { FiscalReminderWorker } from "./workers/fiscal-reminder.worker";
import { NotificationWorker } from "./workers/notification.worker";
import { DocumentWorker } from "./workers/document.worker";
import { EcacBrowserService } from './services/ecac-browser.service';
import { WahaClientService } from "./services/waha-client.service";
import { EmailService } from "./services/email.service";
import { BullBoardModule } from "./workers/bull-board.module";
import { EcacWorker } from './workers/ecac.worker';
import { SubscriptionWorker } from './workers/subscription.worker';

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const url = new URL(REDIS_URL);

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
      BullModule.registerQueue(
        { name: QUEUES.FISCAL_REMINDERS },
        { name: QUEUES.NOTIFICATIONS },
        { name: QUEUES.DOCUMENTS },
        { name: QUEUES.ECAC }
      ),
  ],
  providers: [
    FiscalReminderWorker,
    NotificationWorker,
    DocumentWorker,
    EcacWorker,
    WahaClientService,
    EcacBrowserService,
    SubscriptionWorker,
    EmailService,
    BullBoardModule,
  ],
})
export class JobsModule {}
