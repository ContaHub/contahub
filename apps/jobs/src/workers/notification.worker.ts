import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES, JOB_NAMES } from "@contahub/shared";
import type { SendWhatsappJobData, SendEmailJobData } from "@contahub/shared";
import { WahaClientService } from "../services/waha-client.service";
import { EmailService } from "../services/email.service";

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly wahaClient: WahaClientService,
    private readonly emailService: EmailService
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processando job [${job.name}] ID: ${job.id}`);

    switch (job.name) {
      case JOB_NAMES.SEND_WHATSAPP:
        return this.handleWhatsApp(job as Job<SendWhatsappJobData>);
      case JOB_NAMES.SEND_EMAIL:
        return this.handleEmail(job as Job<SendEmailJobData>);
      default:
        this.logger.warn(`Job name desconhecido: ${job.name}`);
        return null;
    }
  }

  private async handleWhatsApp(job: Job<SendWhatsappJobData>): Promise<void> {
    const { phone, message } = job.data;
    this.logger.log(`Enviando WhatsApp para ${phone}`);
    await this.wahaClient.sendText({ chatId: `${phone}@c.us`, text: message });
    this.logger.log(`WhatsApp enviado para ${phone}`);
  }

  private async handleEmail(job: Job<SendEmailJobData>): Promise<{ id: string }> {
    return this.emailService.send(job.data);
  }
}
