import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaClient } from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '../config/queues.config';

const prisma = new PrismaClient();

export interface ProcessUploadJobData {
  documentId: string;
  workspaceId: string;
  fileType: string;
  storagePath: string;
}

@Injectable()
@Processor(QUEUE_NAMES.DOCUMENTS)
export class DocumentWorker {
  private readonly logger = new Logger(DocumentWorker.name);

  @Process(JOB_NAMES.PROCESS_UPLOAD)
  async processUpload(job: Job<ProcessUploadJobData>) {
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
      data: {
        // Campo de metadata para registrar processamento
        // Será expandido no Sprint 4 com dados extraídos do XML
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Documento ${documentId} processado`);
    return { documentId, workspaceId, processed: true };
  }
}
