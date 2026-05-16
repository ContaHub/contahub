import { z } from "zod";
export interface ApiResponse<T> { data: T; message?: string; }
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; limit: number; total: number; totalPages: number; };
}
export const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido");
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
export const OBLIGATION_LABELS: Record<string, string> = {
  DARF: "DARF", DAS: "DAS (Simples Nacional)", SPED_FISCAL: "SPED Fiscal",
  ESOCIAL: "eSocial", DIRF: "DIRF", RAIS: "RAIS", OUTRO: "Outro",
};
