const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token");
  const data = await res.json();
  return data.token;
}

export interface EcacPendency {
  id: string;
  type: "DEBT" | "DECLARATION" | "INSTALLMENT" | "PROCESS" | "SIMPLES" | "OTHER";
  description: string;
  amount?: number;
  dueDate?: string;
  situation?: string;
  notified: boolean;
  createdAt: string;
}

export interface EcacConsultation {
  id: string;
  consultedAt: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  errorMessage?: string;
  pendencies: EcacPendency[];
}

export interface EcacClientResult {
  client: {
    id: string;
    name: string;
    ecacLastChecked?: string;
    ecacAlertCount: number;
  };
  consulta: EcacConsultation | null;
}

export async function getEcacResultado(clientId: string): Promise<EcacClientResult> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/ecac/${clientId}/resultado`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json();
  return json.data;
}

export async function getEcacHistorico(clientId: string): Promise<EcacConsultation[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/ecac/${clientId}/historico`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json();
  return json.data ?? [];
}

export async function triggerEcacConsulta(clientId: string): Promise<{ jobId: string; message: string }> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/ecac/${clientId}/consultar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Erro ao disparar consulta");
  return json.data;
}

export async function getEcacPendencias(): Promise<any[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/ecac/pendencias`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json();
  return json.data ?? [];
}

export const PENDENCY_CONFIG = {
  DEBT:        { label: "Débito",        color: "bg-red-100 text-red-700",    icon: "💸" },
  DECLARATION: { label: "Declaração",    color: "bg-orange-100 text-orange-700", icon: "📄" },
  INSTALLMENT: { label: "Parcelamento",  color: "bg-blue-100 text-blue-700",  icon: "📅" },
  PROCESS:     { label: "Processo",      color: "bg-purple-100 text-purple-700", icon: "⚖️" },
  SIMPLES:     { label: "Simples Nac.",  color: "bg-yellow-100 text-yellow-700", icon: "🏢" },
  OTHER:       { label: "Outro",         color: "bg-gray-100 text-gray-600",  icon: "📋" },
} as const;

export function formatCurrency(centavos?: number): string {
  if (!centavos) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(centavos / 100);
}
