import { apiFetch } from "./api";

export interface FiscalObligation {
  id: string;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELED";
  competenceMonth: number;
  competenceYear: number;
  dueDate: string;
  completedAt?: string;
  amount?: number;
  notes?: string;
  assignedTo?: string;
  client: {
    id: string;
    name: string;
    cnpj: string;
  };
}

export interface CreateObligationData {
  clientId: string;
  type: string;
  competenceMonth: number;
  competenceYear: number;
  dueDate: string;
  amount?: number;
  notes?: string;
}

export async function getObligations(params?: {
  clientId?: string;
  status?: string;
  month?: number;
  year?: number;
}): Promise<{ data: FiscalObligation[] }> {
  const query = new URLSearchParams();
  if (params?.clientId) query.set("clientId", params.clientId);
  if (params?.status) query.set("status", params.status);
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));
  return apiFetch(`/fiscal/obligations?${query.toString()}`);
}

export async function getUpcomingObligations(days = 7): Promise<{ data: FiscalObligation[] }> {
  return apiFetch(`/fiscal/obligations/upcoming?days=${days}`);
}

export async function createObligation(data: CreateObligationData): Promise<{ data: FiscalObligation }> {
  return apiFetch("/fiscal/obligations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeObligation(id: string): Promise<{ data: FiscalObligation; message: string }> {
  return apiFetch(`/fiscal/obligations/${id}/complete`, { method: "PUT" });
}

// Labels PT-BR para tipo de obrigação
export const OBLIGATION_LABELS: Record<string, string> = {
  DARF: "DARF",
  DAS: "DAS (Simples Nacional)",
  DEFIS: "DEFIS",
  SPED_CONTABIL: "SPED Contábil",
  SPED_FISCAL: "SPED Fiscal",
  SPED_CONTRIBUICOES: "SPED Contribuições",
  ECFD: "ECFD",
  DCTF: "DCTF",
  REINF: "EFD-Reinf",
  ESOCIAL: "eSocial",
  DIRF: "DIRF",
  RAIS: "RAIS",
  GIA: "GIA",
  PGDAS: "PGDAS-D",
  OUTRO: "Outro",
};

// Labels e cores para status
export const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  PENDING: { label: "Pendente", class: "bg-yellow-100 text-yellow-700" },
  IN_PROGRESS: { label: "Em andamento", class: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Concluída", class: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Atrasada", class: "bg-red-100 text-red-700" },
  CANCELED: { label: "Cancelada", class: "bg-gray-100 text-gray-500" },
};

// Nomes dos meses em PT-BR
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Formata valor em centavos para BRL
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// Formata data no padrão BR
export function formatDateBR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}
