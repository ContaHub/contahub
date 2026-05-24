import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../config/queues.config';
import { WahaClientService } from '../services/waha-client.service';

export interface SendWhatsappJobData {
  chatId: string;
  message: string;
  workspaceId: string;
  /** ID do objeto de origem (obrigação, documento, etc.) para rastreabilidade */
  sourceId?: string;
  sourceType?: 'obligation' | 'document' | 'report' | 'custom';
}

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly wahaService: WahaClientService) {}

  @Process(JOB_NAMES.SEND_WHATSAPP)
  async processSendWhatsapp(job: Job<SendWhatsappJobData>) {
    const { chatId, message, sourceId, sourceType } = job.data;

    this.logger.log(
      `Enviando WhatsApp → ${chatId}${sourceType ? ` [${sourceType}:${sourceId}]` : ''}`,
    );

    // Atualiza progresso visível no Bull Board
    await job.progress(10);

    const isConnected = await this.wahaService.checkStatus();
    if (!isConnected) {
      // WAHA offline — falha imediata para re-enfileirar com backoff
      throw new Error('WAHA não está conectado. Job re-enfileirado para retry.');
    }

    await job.progress(50);

    const result = await this.wahaService.sendText({ chatId, text: message });

    await job.progress(100);

    if (!result.success) {
      throw new Error(`Falha WAHA: ${result.error}`);
    }

    return {
      sent: true,
      chatId,
      messageId: result.messageId,
      sourceId,
      sourceType,
    };
  }
}
