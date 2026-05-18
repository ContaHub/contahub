#!/bin/bash
# ContaHub — Dashboard com dados reais + Página Fiscal
# Execute na raiz do projeto: bash fase1-final.sh

set -e
echo "🚀 Criando Dashboard com dados reais e Página Fiscal..."

# ================================================================
# 1. BACKEND — Endpoint de stats para o dashboard
# ================================================================
mkdir -p apps/api/src/modules/dashboard

cat > apps/api/src/modules/dashboard/dashboard.module.ts << 'EOF'
import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
EOF

cat > apps/api/src/modules/dashboard/dashboard.controller.ts << 'EOF'
import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Retorna todos os números do dashboard em uma única chamada
  // Evita múltiplos requests do frontend
  @Get("stats")
  async getStats(@Req() req: Request) {
    return this.dashboardService.getStats(req.workspaceId);
  }
}
EOF

cat > apps/api/src/modules/dashboard/dashboard.service.ts << 'EOF'
import { Injectable } from "@nestjs/common";
import { prisma } from "@contahub/database";

@Injectable()
export class DashboardService {
  async getStats(workspaceId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Roda todas as queries em paralelo para máxima performance
    const [
      activeClients,
      pendingObligations,
      dueTodayObligations,
      completedThisMonth,
      upcomingObligations,
    ] = await Promise.all([
      // Total de clientes ativos
      prisma.client.count({
        where: { workspaceId, status: "ACTIVE" },
      }),

      // Obrigações pendentes ou em andamento
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),

      // Vencendo hoje (inclui atrasadas do dia)
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { gte: todayStart, lt: todayEnd },
        },
      }),

      // Concluídas no mês atual
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lt: monthEnd },
        },
      }),

      // Próximas 5 obrigações para o widget de alertas
      prisma.fiscalObligation.findMany({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { gte: now },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

    return {
      data: {
        activeClients,
        pendingObligations,
        dueTodayObligations,
        completedThisMonth,
        upcomingObligations,
      },
    };
  }
}
EOF

# Registrar DashboardModule no AppModule
cat > apps/api/src/app.module.ts << 'EOF'
import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkspaceMiddleware } from "./common/middleware/workspace.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { FiscalModule } from "./modules/fiscal/fiscal.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ClientsModule,
    FiscalModule,
    DashboardModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WorkspaceMiddleware)
      .exclude({ path: "api/v1/health", method: RequestMethod.GET })
      .forRoutes("*");
  }
}
EOF

# ================================================================
# 2. FRONTEND — lib/dashboard.ts
# ================================================================
cat > apps/web/lib/dashboard.ts << 'EOF'
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
    client: { id: string; name: string };
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
EOF

# ================================================================
# 3. FRONTEND — Dashboard page com dados reais
# ================================================================
cat > "apps/web/app/(dashboard)/dashboard/page.tsx" << 'EOF'
"use client";

import { useState, useEffect } from "react";
import { getDashboardStats, DashboardStats, formatDate, getDaysUntil, getDueBadgeClass } from "@/lib/dashboard";
import { OBLIGATION_LABELS } from "@/lib/fiscal";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral do escritório
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Clientes Ativos"
          value={loading ? null : stats?.activeClients ?? 0}
          icon="👥"
          href="/dashboard/clients"
          color="blue"
        />
        <StatCard
          title="Obrigações Pendentes"
          value={loading ? null : stats?.pendingObligations ?? 0}
          icon="📋"
          href="/dashboard/fiscal"
          color="purple"
        />
        <StatCard
          title="Vencendo Hoje"
          value={loading ? null : stats?.dueTodayObligations ?? 0}
          icon="⚠️"
          href="/dashboard/fiscal"
          color="red"
          highlight
        />
        <StatCard
          title="Concluídas no Mês"
          value={loading ? null : stats?.completedThisMonth ?? 0}
          icon="✅"
          href="/dashboard/fiscal"
          color="green"
        />
      </div>

      {/* Widget — Próximas obrigações */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Próximas obrigações</h2>
          <Link
            href="/dashboard/fiscal"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats?.upcomingObligations?.length ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-gray-500 text-sm">Nenhuma obrigação pendente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.upcomingObligations.map((ob) => (
              <div key={ob.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {ob.type.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {OBLIGATION_LABELS[ob.type] || ob.type}
                    </p>
                    <p className="text-xs text-gray-400">{ob.client.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(ob.dueDate)}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDueBadgeClass(ob.dueDate)}`}>
                    {getDaysUntil(ob.dueDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de card de métrica
function StatCard({
  title,
  value,
  icon,
  href,
  color,
  highlight = false,
}: {
  title: string;
  value: number | null;
  icon: string;
  href: string;
  color: "blue" | "purple" | "red" | "green";
  highlight?: boolean;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  };
  const c = colorMap[color];

  return (
    <Link href={href}>
      <div className={`rounded-xl border ${highlight ? `${c.border} ${c.bg}` : "border-gray-200 bg-white"} p-6 hover:shadow-md transition-shadow cursor-pointer`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <span className="text-lg">{icon}</span>
        </div>
        {value === null ? (
          <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className={`text-3xl font-bold ${highlight ? c.text : "text-gray-900"}`}>
            {value}
          </p>
        )}
      </div>
    </Link>
  );
}
EOF

# ================================================================
# 4. FRONTEND — lib/fiscal.ts
# ================================================================
cat > apps/web/lib/fiscal.ts << 'EOF'
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
EOF

# ================================================================
# 5. FRONTEND — Página Fiscal
# ================================================================
mkdir -p "apps/web/app/(dashboard)/dashboard/fiscal"
mkdir -p "apps/web/components/fiscal"

cat > "apps/web/components/fiscal/ObligationModal.tsx" << 'EOF'
"use client";

import { useState, useEffect } from "react";
import { createObligation, OBLIGATION_LABELS, MONTHS } from "@/lib/fiscal";
import { getClients, Client } from "@/lib/clients";

interface ObligationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ObligationModal({ onClose, onSuccess }: ObligationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  const now = new Date();
  const [form, setForm] = useState({
    clientId: "",
    type: "DAS",
    competenceMonth: now.getMonth() + 1,
    competenceYear: now.getFullYear(),
    dueDate: "",
    amount: "",
    notes: "",
  });

  // Carrega clientes para o select
  useEffect(() => {
    getClients({ limit: 100 }).then((res) => setClients(res.data));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createObligation({
        clientId: form.clientId,
        type: form.type,
        competenceMonth: Number(form.competenceMonth),
        competenceYear: Number(form.competenceYear),
        dueDate: new Date(form.dueDate).toISOString(),
        amount: form.amount ? Math.round(Number(form.amount) * 100) : undefined,
        notes: form.notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nova Obrigação Fiscal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Obrigação *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(OBLIGATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Competência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Competência *</label>
              <select
                name="competenceMonth"
                value={form.competenceMonth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
              <select
                name="competenceYear"
                value={form.competenceYear}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Vencimento *</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
              {loading ? "Salvando..." : "Criar obrigação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
EOF

cat > "apps/web/app/(dashboard)/dashboard/fiscal/page.tsx" << 'EOF'
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getObligations, completeObligation,
  FiscalObligation, OBLIGATION_LABELS, STATUS_CONFIG,
  MONTHS, formatCurrency, formatDateBR,
} from "@/lib/fiscal";
import { ObligationModal } from "@/components/fiscal/ObligationModal";

// Retorna ícone por tipo de obrigação
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    DARF: "💰", DAS: "📊", DEFIS: "📄", SPED_CONTABIL: "📚",
    SPED_FISCAL: "📋", ESOCIAL: "👥", DIRF: "📑", RAIS: "📃",
    REINF: "🔄", DCTF: "📝",
  };
  return icons[type] || "📌";
}

export default function FiscalPage() {
  const [obligations, setObligations] = useState<FiscalObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Filtros
  const now = new Date();
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());

  const fetchObligations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getObligations({
        status: statusFilter || undefined,
        month: monthFilter,
        year: yearFilter,
      });
      setObligations(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, yearFilter]);

  useEffect(() => { fetchObligations(); }, [fetchObligations]);

  async function handleComplete(id: string) {
    setCompleting(id);
    try {
      await completeObligation(id);
      fetchObligations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(null);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Carregando..." : `${obligations.length} obrigação${obligations.length !== 1 ? "ões" : ""} encontrada${obligations.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova obrigação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500 font-medium">Nenhuma obrigação encontrada</p>
            <p className="text-gray-400 text-sm mt-1">
              {MONTHS[monthFilter - 1]} de {yearFilter}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4 pl-6">Obrigação</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Competência</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Status</th>
                  <th className="pb-3 pt-4 pr-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {obligations.map((ob) => {
                  const status = STATUS_CONFIG[ob.status];
                  const isPending = ob.status === "PENDING" || ob.status === "IN_PROGRESS";
                  return (
                    <tr key={ob.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Tipo */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getTypeIcon(ob.type)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {OBLIGATION_LABELS[ob.type] || ob.type}
                          </span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-4">
                        <p className="text-sm text-gray-700">{ob.client.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{ob.client.cnpj}</p>
                      </td>

                      {/* Competência */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {MONTHS[ob.competenceMonth - 1]?.slice(0, 3)} {ob.competenceYear}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">{formatDateBR(ob.dueDate)}</span>
                      </td>

                      {/* Valor */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {ob.amount ? formatCurrency(ob.amount) : "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.class}`}>
                          {status?.label}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-4 pr-6">
                        {isPending && (
                          <button
                            onClick={() => handleComplete(ob.id)}
                            disabled={completing === ob.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50"
                          >
                            {completing === ob.id ? "..." : "✓ Concluir"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ObligationModal
          onClose={() => setModalOpen(false)}
          onSuccess={fetchObligations}
        />
      )}
    </div>
  );
}
EOF

echo ""
echo "✅ Dashboard com dados reais + Página Fiscal criados!"
echo ""
echo "Arquivos gerados:"
echo "  apps/api/src/modules/dashboard/ (3 arquivos)"
echo "  apps/web/lib/dashboard.ts"
echo "  apps/web/lib/fiscal.ts"
echo "  apps/web/app/(dashboard)/dashboard/page.tsx"
echo "  apps/web/app/(dashboard)/dashboard/fiscal/page.tsx"
echo "  apps/web/components/fiscal/ObligationModal.tsx"
echo ""
echo "Próximo passo: reiniciar a API para carregar o DashboardModule"
