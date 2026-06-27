// ─── Tipos compartilhados para jobs de notificação ───────────────────────────
// Importado por: apps/api (producer) e apps/jobs (consumer)
// NUNCA duplicar estas interfaces nos apps — sempre importar daqui

// ── WhatsApp ──────────────────────────────────────────────────────────────────

export interface SendWhatsappJobData {
  /** Número no formato internacional: 5511999999999 */
  phone: string;
  /** Texto da mensagem (suporta *negrito* e _itálico_ do WhatsApp) */
  message: string;
}

// ── E-mail ────────────────────────────────────────────────────────────────────

export type EmailTemplate =
  | "deadline-alert"
  | "obligation-completed"
  | "portal-welcome"
  | "workspace-welcome";   // ← NOVO: boas-vindas ao contador após onboarding

export interface SendEmailJobData {
  template: EmailTemplate;
  to: string;
  recipientName: string;
  payload: DeadlineAlertPayload | ObligationCompletedPayload | PortalWelcomePayload | WorkspaceWelcomePayload;
}

// ─── Payloads por template ────────────────────────────────────────────────────

export interface DeadlineAlertPayload {
  obligationType: string;   // "DAS", "DARF", "DEFIS", etc.
  clientName: string;
  dueDate: string;          // "30/05/2026"
  daysUntil: number;        // 1, 3 ou 7
  workspaceName: string;
  portalUrl?: string;
}

export interface ObligationCompletedPayload {
  obligationType: string;
  clientName: string;
  completedAt: string;      // "24/05/2026 às 14h30"
  workspaceName: string;
  accountantName: string;
}

export interface PortalWelcomePayload {
  workspaceName: string;
  portalUrl: string;
  temporaryPassword?: string;
}

// ── NOVO ──────────────────────────────────────────────────────────────────────

export interface WorkspaceWelcomePayload {
  /** Nome do workspace criado automaticamente pelo webhook */
  workspaceName: string;
  /** URL do dashboard — para o contador acessar direto pelo e-mail */
  dashboardUrl: string;
  /** Dias de trial restantes — calculado no momento do envio (14 por padrão) */
  trialDays: number;
}