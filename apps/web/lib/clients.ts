import { apiFetch } from "./api";

export interface Client {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  cpf?: string;
  taxRegime: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  email?: string;
  phone?: string;
  whatsapp?: string;
  portalEnabled?: boolean;
  portalEmail?: string;
  notes?: string;
  tags:            string[];
  cnpjStatus?:     string | null;
  cnpjLastChecked?: string | null;
  createdAt:       string;
}

export interface ClientsResponse {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClientData {
  name: string;
  cnpj: string;
  taxRegime: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  tags?: string[];
}

// Busca lista de clientes com paginação e busca
export async function getClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<ClientsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);

  return apiFetch<ClientsResponse>(`/clients?${query.toString()}`);
}

// Cria um novo cliente
export async function createClient(data: CreateClientData): Promise<{ data: Client; message: string }> {
  return apiFetch("/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Atualiza um cliente existente
export async function updateClient(
  id: string,
  data: Partial<CreateClientData>
): Promise<{ data: Client; message: string }> {
  return apiFetch(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
  const tokenRes = await fetch("/api/auth/token");
  const { token } = await tokenRes.json();
  const res = await fetch(`${API_URL}/api/v1/clients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao remover cliente" }));
    throw new Error(err.message ?? "Erro ao remover cliente");
  }
  // Não faz .json() — DELETE retorna 204 sem body
}

// Labels em PT-BR para regime tributário
export const TAX_REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
  MEI: "MEI",
  ISENTO: "Isento",
};

// Formata CNPJ: 12345678000190 → 12.345.678/0001-90
export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
/*
export async function createClientFree(data: any): Promise<{ data: Client; message: string }> {
  return apiFetch("/clients/free", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
*/