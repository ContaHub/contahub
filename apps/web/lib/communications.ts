const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

// Mesmo padrão do lib/ecac.ts: o token do Clerk vem de uma rota do Next
async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token");
  const data = await res.json();
  return data.token;
}

export interface CommunicationItem {
  id: string;
  channel: "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE";
  // O banco guarda como string livre; hoje usamos "inbound" e "outbound"
  direction: string;
  subject: string | null;
  content: string;
  sentAt: string | null;
  createdAt: string;
}

export interface ClientCommunications {
  client: { id: string; name: string; tradeName: string | null };
  communications: CommunicationItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function getClientCommunications(
  clientId: string,
  page = 1,
): Promise<ClientCommunications> {
  const token = await getToken();
  const res = await fetch(
    `${API_URL}/api/v1/communications/client/${clientId}?page=${page}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Erro ao carregar comunicações");
  // Envelope do backend: { data: { client, communications }, meta }
  return { ...json.data, meta: json.meta };
}

export const CHANNEL_LABELS: Record<CommunicationItem["channel"], string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  PORTAL: "Portal",
  PHONE: "Telefone",
};