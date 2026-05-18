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
