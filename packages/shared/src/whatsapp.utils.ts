// Normaliza telefone brasileiro para o formato que o WAHA espera (somente dígitos, com DDI 55).
// Por que aqui no shared: API e jobs usam a mesma regra, então ela fica em um lugar só.
export function normalizeWhatsappNumber(raw?: string | null): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");

  // 10 ou 11 dígitos = DDD + número, sem DDI → prefixa 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  // 12 ou 13 dígitos começando com 55 = já tem DDI
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }

  // Qualquer outro formato é inválido: melhor não enviar do que mandar para número errado
  return null;
}

export interface PortalWelcomeWhatsappInput {
  recipientName: string;
  workspaceName: string;
  portalUrl: string;
}

// Usa a sintaxe de formatação do WhatsApp (*negrito*), igual às outras mensagens do projeto
export function buildPortalWelcomeWhatsapp({
  recipientName,
  workspaceName,
  portalUrl,
}: PortalWelcomeWhatsappInput): string {
  return [
    `Olá, ${recipientName}! 👋`,
    ``,
    `O *${workspaceName}* liberou o seu acesso ao portal do cliente.`,
    ``,
    `Por lá você acompanha obrigações, envia e baixa documentos e aprova relatórios.`,
    ``,
    `🔗 Acesse: ${portalUrl}`,
    ``,
    `Use o e-mail cadastrado no escritório para entrar.`,
  ].join("\n");
}

// ─── Avisos do portal: documentos e obrigações ───────────────────────────────
// Regra: a mensagem avisa que há novidade e leva ao portal. Nunca inclui valores.

const MAX_LABEL = 80;

// O texto digitado pelo escritório não pode quebrar a formatação do WhatsApp
// (*negrito*, _itálico_) nem alongar a mensagem.
function cleanLabel(text?: string | null): string {
  if (!text) return "";
  const flat = text.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
  return flat.length > MAX_LABEL ? `${flat.slice(0, MAX_LABEL - 1)}…` : flat;
}

function portalLink(portalUrl: string, path: string): string {
  return `${portalUrl.replace(/\/+$/, "")}/${path}`;
}

const OBLIGATION_TYPE_LABELS: Record<string, string> = {
  DARF: "DARF", DAS: "DAS (Simples Nacional)", DEFIS: "DEFIS",
  SPED_CONTABIL: "SPED Contábil", SPED_FISCAL: "SPED Fiscal",
  REINF: "EFD-Reinf", ESOCIAL: "eSocial", DIRF: "DIRF",
  RAIS: "RAIS", GIA: "GIA", PGDAS: "PGDAS-D", OUTRO: "Outro",
};

function obligationTypeLabel(type: string): string {
  return OBLIGATION_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

interface PortalNoticeBase {
  recipientName: string;
  workspaceName: string;
  /** URL base do portal do escritório: https://.../portal/{slug} */
  portalUrl: string;
}

export interface DocumentNoticeInput extends PortalNoticeBase {
  /** Descrição ou nome do arquivo. Só é exibido quando count === 1. */
  documentLabel?: string | null;
  /** Quantidade de documentos agrupados no aviso (padrão 1). */
  count?: number;
}

// Documento novo disponível para consulta (aba Documentos)
export function buildDocumentSharedWhatsapp({
  recipientName,
  workspaceName,
  portalUrl,
  documentLabel,
  count = 1,
}: DocumentNoticeInput): string {
  const label = cleanLabel(documentLabel);
  const headline =
    count > 1
      ? `disponibilizou *${count} novos documentos* no seu portal.`
      : `disponibilizou *um novo documento* no seu portal${label ? `: ${label}` : "."}`;

  return [
    `Olá, ${recipientName}! 👋`,
    ``,
    `O *${workspaceName}* ${headline}`,
    ``,
    `🔗 Acesse: ${portalLink(portalUrl, "documents")}`,
  ].join("\n");
}

// Documento aguardando aprovação do cliente (aba Documentos Para Aprovação)
export function buildDocumentForReviewWhatsapp({
  recipientName,
  workspaceName,
  portalUrl,
  documentLabel,
  count = 1,
}: DocumentNoticeInput): string {
  const label = cleanLabel(documentLabel);
  const headline =
    count > 1
      ? `enviou *${count} documentos* para a sua aprovação.`
      : `enviou *um documento* para a sua aprovação${label ? `: ${label}` : "."}`;

  return [
    `Olá, ${recipientName}! 👋`,
    ``,
    `O *${workspaceName}* ${headline}`,
    ``,
    `Revise e aprove pelo portal:`,
    `🔗 ${portalLink(portalUrl, "reports")}`,
  ].join("\n");
}

export interface ObligationNoticeInput extends PortalNoticeBase {
  /** Tipo da obrigação como o projeto exibe: "DAS", "DARF"... */
  obligationType: string;
  /** "05/2026" */
  competence: string;
  /** "30/05/2026" */
  dueDate: string;
}

// Obrigação nova lançada pelo escritório (aba Obrigações). Sem valor, de propósito.
export function buildObligationCreatedWhatsapp({
  recipientName,
  workspaceName,
  portalUrl,
  obligationType,
  competence,
  dueDate,
}: ObligationNoticeInput): string {
  return [
    `Olá, ${recipientName}! 👋`,
    ``,
    `O *${workspaceName}* lançou uma nova obrigação para você:`,
    ``,
    `📋 *${cleanLabel(obligationType)}* — competência ${competence}`,
    `📅 Vencimento: ${dueDate}`,
    ``,
    `🔗 Detalhes: ${portalLink(portalUrl, "obligations")}`,
  ].join("\n");
}

export interface ObligationDueDateChangedInput extends PortalNoticeBase {
  obligationType: string;
  /** "05/2026" */
  competence: string;
  /** "20/05/2026" */
  previousDueDate: string;
  /** "25/05/2026" */
  dueDate: string;
}

// Vencimento alterado pelo escritório. Sem valor, de propósito.
export function buildObligationDueDateChangedWhatsapp({
  recipientName,
  workspaceName,
  portalUrl,
  obligationType,
  competence,
  previousDueDate,
  dueDate,
}: ObligationDueDateChangedInput): string {
  return [
    `Olá, ${recipientName}! 👋`,
    ``,
    `O *${workspaceName}* alterou o vencimento de uma obrigação:`,
    ``,
    `📋 *${cleanLabel(obligationTypeLabel(obligationType))}* — competência ${competence}`,
    `📅 Antes: ${previousDueDate}`,
    `📅 Agora: *${dueDate}*`,
    ``,
    `🔗 Detalhes: ${portalLink(portalUrl, "obligations")}`,
  ].join("\n");
}