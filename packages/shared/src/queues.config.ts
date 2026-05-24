/**
 * Nomes das filas BullMQ — centralizados aqui para serem importados
 * tanto no apps/api (produtor) quanto no apps/jobs (consumidor).
 *
 * Por que centralizar: evitar que api enfileire em "fiscal-reminders"
 * e o worker escute em "fiscal_reminders" (bug silencioso difícil de achar).
 */
export const QUEUE_NAMES = {
  /** Alertas de prazo fiscal enviados via WhatsApp/e-mail */
  FISCAL_REMINDERS: 'fiscal-reminders',

  /** Envio assíncrono de mensagens WhatsApp via WAHA */
  NOTIFICATIONS: 'notifications',

  /** Operações de documento: processamento pós-upload, geração de preview */
  DOCUMENTS: 'documents',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Tipos de jobs dentro de cada fila.
 * O campo "name" do job BullMQ determina qual processor executa.
 */
export const JOB_NAMES = {
  // Fila: fiscal-reminders
  SEND_FISCAL_ALERT: 'send-fiscal-alert',
  DAILY_SCAN: 'daily-scan',

  // Fila: notifications
  SEND_WHATSAPP: 'send-whatsapp',
  SEND_EMAIL: 'send-email',  // Sprint 2

  // Fila: documents
  PROCESS_UPLOAD: 'process-upload',
} as const;

/**
 * Configuração padrão de retry para jobs.
 * Em produção, falhas transitórias (WAHA offline, Redis lento) são reprocessadas
 * com backoff exponencial — evita sobrecarregar serviços instáveis.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,  // 5s → 10s → 20s
  },
  removeOnComplete: {
    age: 24 * 3600,  // Guarda jobs concluídos por 24h (visível no Bull Board)
    count: 100,       // Máximo de 100 jobs concluídos por fila
  },
  removeOnFail: {
    age: 7 * 24 * 3600,  // Guarda falhas por 7 dias para diagnóstico
  },
};
