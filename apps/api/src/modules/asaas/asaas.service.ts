import { Injectable, Logger } from '@nestjs/common';

// ── Tipos Asaas ───────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  value: number;
  nextDueDate: string;
  status: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  billingType: string;
  invoiceUrl?: string;
  pixQrCode?: string;
  pixKey?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  private get baseUrl(): string {
    // sandbox: https://sandbox.asaas.com/api/v3
    // produção: https://api.asaas.com/api/v3
    return process.env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  private get apiKey(): string {
    const key = process.env.ASAAS_API_KEY;
    if (!key) throw new Error('ASAAS_API_KEY não configurada');
    return key;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: object,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.errors?.[0]?.description ?? data?.message ?? `Asaas error ${res.status}`;
      this.logger.error(`Asaas ${method} ${path} → ${res.status}: ${msg}`);
      throw new Error(msg);
    }

    return data as T;
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  async createCustomer(params: {
    name: string;
    email: string;
    cpfCnpj?: string;
  }): Promise<AsaasCustomer> {
    this.logger.log(`Criando customer Asaas: ${params.email}`);
    return this.request<AsaasCustomer>('POST', '/customers', params);
  }

  async findCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
    const res = await this.request<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?email=${encodeURIComponent(email)}`,
    );
    return res.data?.[0] ?? null;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async createSubscription(params: {
    customer: string;          // asaasCustomerId
    billingType: 'CREDIT_CARD' | 'PIX';
    value: number;             // em reais (ex: 97.00)
    nextDueDate: string;       // "YYYY-MM-DD"
    description?: string;
    cycle?: 'MONTHLY' | 'YEARLY';
    creditCard?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo?: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      phone: string;
    };
  }): Promise<AsaasSubscription> {
    this.logger.log(`Criando subscription Asaas — customer: ${params.customer} — ${params.billingType}`);
    return this.request<AsaasSubscription>('POST', '/subscriptions', {
      ...params,
      cycle: params.cycle ?? 'MONTHLY',
    });
  }

  async cancelSubscription(asaasSubscriptionId: string): Promise<void> {
    this.logger.log(`Cancelando subscription Asaas: ${asaasSubscriptionId}`);
    await this.request('DELETE', `/subscriptions/${asaasSubscriptionId}`);
  }

  async getSubscription(asaasSubscriptionId: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('GET', `/subscriptions/${asaasSubscriptionId}`);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async getPaymentsBySubscription(asaasSubscriptionId: string): Promise<AsaasPayment[]> {
    const res = await this.request<{ data: AsaasPayment[] }>(
      'GET',
      `/subscriptions/${asaasSubscriptionId}/payments`,
    );
    return res.data ?? [];
  }

  // ── PIX QR Code ───────────────────────────────────────────────────────────

  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string }> {
    return this.request('GET', `/payments/${paymentId}/pixQrCode`);
  }
}
