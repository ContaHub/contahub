import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { QUEUES, JOB_NAMES } from '@contahub/shared';

const prisma = new PrismaClient();

export interface ProcessUploadJobData {
  documentId: string;
  workspaceId: string;
  fileType: string;
  storagePath: string;
}

@Injectable()
@Processor(QUEUES.DOCUMENTS)
export class DocumentWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentWorker.name);

  constructor() {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.PROCESS_UPLOAD:
        return this.processUpload(job as Job<ProcessUploadJobData>);
      default:
        this.logger.warn(`Job name desconhecido: ${job.name}`);
        return null;
    }
  }

  private async processUpload(job: Job<ProcessUploadJobData>) {
    const { documentId, workspaceId, fileType } = job.data;
    this.logger.log(`Processando documento ${documentId} (${fileType})`);
    /**
     * Placeholder para Sprint 4:
     * - fileType === 'xml' → parsear NF-e e extrair dados
     * - fileType === 'pdf' → gerar thumbnail preview
     * - Qualquer tipo → atualizar status para PROCESSED no banco
     */
    await prisma.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    });
    this.logger.log(`Documento ${documentId} processado`);
    return { documentId, workspaceId, processed: true };
  }
}