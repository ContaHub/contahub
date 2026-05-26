// ─── Fonte única de verdade para nomes de filas e jobs ───────────────────────
// Importado por: apps/api (producer) e apps/jobs (consumer)
// NUNCA usar strings literais — sempre importar daqui

export const QUEUES = {
  FISCAL_REMINDERS: "fiscal-reminders",
  NOTIFICATIONS: "notifications",
  DOCUMENTS: "documents",
} as const;

export const JOB_NAMES = {
  SEND_WHATSAPP: "send-whatsapp",
  SEND_EMAIL: "send-email",              // ← NOVO Sprint 2
  SCAN_FISCAL_OBLIGATIONS: "scan-fiscal-obligations",
  PROCESS_DOCUMENT: "process-document",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
