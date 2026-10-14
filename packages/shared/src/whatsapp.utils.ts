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