/**
 * lib/fiscal.ts
 * Funções de acesso à API de obrigações fiscais.
 *
 * IMPORTANTE: todas as funções recebem `token` como parâmetro.
 * O token vem do Clerk via `getToken()` no componente — nunca
 * buscamos /api/auth/token aqui (essa rota retorna 404 no novo setup).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

// ─── Listar obrigações ────────────────────────────────────────
export async function getObligations(
  token: string | null,
  filters?: { month?: string; status?: string; clientId?: string }
) {
  const params = new URLSearchParams();
  if (filters?.month)    params.set("month",    filters.month);
  if (filters?.status)   params.set("status",   filters.status);
  if (filters?.clientId) params.set("clientId", filters.clientId);
  // Cache-buster para evitar 304 Not Modified
  params.set("t", String(Date.now()));

  const qs = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(`${API_URL}/api/v1/fiscal/obligations${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao buscar obrigações" }));
    throw new Error(err.message ?? "Erro ao buscar obrigações");
  }

  return res.json();
}

// ─── Criar obrigação ──────────────────────────────────────────
export async function createObligation(
  data: Record<string, unknown>,
  token: string | null
) {
  const res = await fetch(`${API_URL}/api/v1/fiscal/obligations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao criar obrigação" }));
    throw new Error(err.message ?? "Erro ao criar obrigação");
  }

  return res.json();
}

// ─── Concluir obrigação ───────────────────────────────────────
export async function completeObligation(
  id: string,
  token: string | null
) {
  const res = await fetch(
    `${API_URL}/api/v1/fiscal/obligations/${id}/complete`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        // Content-Type necessário mesmo sem body para alguns servidores NestJS
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao concluir obrigação" }));
    throw new Error(err.message ?? "Erro ao concluir obrigação");
  }

  return res.json();
}

// ─── Deletar obrigação ────────────────────────────────────────
export async function deleteObligation(
  id: string,
  token: string | null
) {
  const res = await fetch(`${API_URL}/api/v1/fiscal/obligations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  // DELETE pode retornar 204 sem body
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao remover obrigação" }));
    throw new Error(err.message ?? "Erro ao remover obrigação");
  }
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

// Nomes dos meses em PT-BR
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
