import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import * as http from 'http';
import express from 'express';
import { QUEUES } from '@contahub/shared';

@Module({})
export class BullBoardModule implements OnModuleInit {
  private readonly logger = new Logger('BullBoard');

  constructor(
    @InjectQueue(QUEUES.FISCAL_REMINDERS)
    private readonly fiscalQueue: Queue,

    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,

    @InjectQueue(QUEUES.DOCUMENTS)
    private readonly documentsQueue: Queue,
  ) {}

  onModuleInit() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    createBullBoard({
      queues: [
        // Cast necessário: typings do @bull-board/api@5.23.0 ainda não
        // acompanham a API do bullmq@5.76.9 (JobProgress). O cast aqui é no
        // ADAPTER retornado, não na fila — o mismatch estrutural está no
        // retorno de BullMQAdapter vs BaseAdapter, não no argumento do
        // construtor. Não afeta o comportamento real das filas — só o
        // painel visual de monitoramento.
        new BullMQAdapter(this.fiscalQueue) as any,
        new BullMQAdapter(this.notificationsQueue) as any,
        new BullMQAdapter(this.documentsQueue) as any,
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
