import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import * as http from 'http';
import express from 'express';
import { QUEUE_NAMES } from '../config/queues.config';

@Module({})
export class BullBoardModule implements OnModuleInit {
  private readonly logger = new Logger('BullBoard');

  constructor(
    @InjectQueue(QUEUE_NAMES.FISCAL_REMINDERS)
    private readonly fiscalQueue: Queue,

    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,

    @InjectQueue(QUEUE_NAMES.DOCUMENTS)
    private readonly documentsQueue: Queue,
  ) {}

  onModuleInit() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    createBullBoard({
      queues: [
        new BullAdapter(this.fiscalQueue),
        new BullAdapter(this.notificationsQueue),
        new BullAdapter(this.documentsQueue),
      ],
      serverAdapter,
    });

    const app = express();

    // Proteção básica com API key (mesmo padrão do WAHA)
    app.use('/queues', (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      const expectedKey = process.env.BULL_BOARD_API_KEY || 'contahub-local';
      if (apiKey !== expectedKey) {
        return res.status(401).json({ message: 'API key inválida' });
      }
      next();
    });

    app.use('/queues', serverAdapter.getRouter());

    const PORT = parseInt(process.env.BULL_BOARD_PORT || '3003', 10);
    http.createServer(app).listen(PORT, () => {
      this.logger.log(`Bull Board disponível em http://localhost:${PORT}/queues`);
      this.logger.log(`Header necessário: x-api-key: ${process.env.BULL_BOARD_API_KEY || 'contahub-local'}`);
    });
  }
}
