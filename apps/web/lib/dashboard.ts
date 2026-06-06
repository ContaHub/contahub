import { apiFetch } from "./api";

export interface DashboardStats {
  activeClients: number;
  pendingObligations: number;
  dueTodayObligations: number;
  completedThisMonth: number;
  upcomingObligations: Array<{
    id: string;
    type: string;
    dueDate: string;
    status: string;
    client: { id: string; tradeName: string };
  }>;
}

export async function getDashboardStats(): Promise<{ data: DashboardStats }> {
  return apiFetch("/dashboard/stats");
}

// Formata data em PT-BR: 2024-05-20 → "20 mai"
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// Retorna quantos dias faltam ou se está atrasado
export function getDaysUntil(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Amanhã";
  return `${diff} dias`;
}

// Cor do badge baseada nos dias restantes
export function getDueBadgeClass(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "bg-red-100 text-red-700";
  if (diff <= 3) return "bg-orange-100 text-orange-700";
  if (diff <= 7) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}
