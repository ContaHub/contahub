// ─── Fonte única de verdade para nomes de filas e jobs ───────────────────────
// Importado por: apps/api (producer) e apps/jobs (consumer)
// NUNCA usar strings literais — sempre importar daqui

export const QUEUES = {
  FISCAL_REMINDERS: 'fiscal-reminders',
  NOTIFICATIONS:    'notifications',
  DOCUMENTS:        'documents',
} as const;

export const JOB_NAMES = {
  // Fila: fiscal-reminders
  SEND_FISCAL_ALERT: 'send-fiscal-alert',
  DAILY_SCAN:        'daily-scan',

  // Fila: notifications
  SEND_WHATSAPP: 'send-whatsapp',
  SEND_EMAIL:    'send-email',

  // Fila: documents
  PROCESS_UPLOAD:          'process-upload',
  SCAN_FISCAL_OBLIGATIONS: 'scan-fiscal-obligations',
  PROCESS_DOCUMENT:        'process-document',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: {
    age:   24 * 3600,
    count: 100,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
  },
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type JobName   = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];