import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface SendTextPayload {
  /** Número no formato internacional sem +: "5511999990000" */
  chatId: string;
  text: string;
  session?: string;
}

export interface WahaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Cliente HTTP para o WAHA (WhatsApp HTTP API).
 *
 * Por que duplicar do apps/api?
 * O apps/jobs é um processo Node separado — não tem acesso ao container
 * de injeção de dependência do NestJS da API. Por isso precisamos de uma
 * versão independente. Futuramente isso pode virar um pacote em packages/shared.
 */
@Injectable()
export class WahaClientService {
  private readonly logger = new Logger(WahaClientService.name);
  private readonly client: AxiosInstance;
  private readonly session: string;

  constructor() {
    const wahaUrl = process.env.WAHA_URL || 'http://localhost:3000';
    const apiKey  = process.env.WAHA_API_KEY || '';
    this.session  = process.env.WAHA_SESSION || 'default';

    this.client = axios.create({
      baseURL: wahaUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
      timeout: 15000,
    });

    this.logger.log(`WAHA configurado: ${wahaUrl} (sessão: ${this.session})`);
  }

  async sendText(payload: SendTextPayload): Promise<WahaSendResult> {
    try {
      const response = await this.client.post('/api/sendText', {
        chatId: `${payload.chatId}@c.us`,
        text: payload.text,
        session: payload.session ?? this.session,
      });

      return { success: true, messageId: response.data?.id };
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Erro desconhecido';
      this.logger.error(`Falha ao enviar WhatsApp para ${payload.chatId}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      const res = await this.client.get(`/api/sessions/${this.session}`);
      return res.data?.status === 'WORKING';
    } catch {
      return false;
    }
  }
}
