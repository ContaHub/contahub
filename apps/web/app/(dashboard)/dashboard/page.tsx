"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  Receipt,
} from "lucide-react";
import { MetricCard, Card, SectionHeader, Badge } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@clerk/nextjs";
import { getDashboardStats } from "@/lib/dashboard";
import { getObligations } from "@/lib/fiscal";

// Formatador de data pt-BR
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(date: string) {
  const d = Math.round(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return d;
}

function daysBadge(days: number) {
  if (days < 0) return <Badge variant="danger">Vencido</Badge>;
  if (days === 0) return <Badge variant="danger">Hoje</Badge>;
  if (days <= 3) return <Badge variant="warning">{days} dias</Badge>;
  return <Badge variant="success">{days} dias</Badge>;
}

const oblIcons: Record<string, React.ElementType> = {
  DAS: BarChart2,
  DARF: Receipt,
};

export default function DashboardPage() {
  const openMenu = useMobileMenu();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [obligations, setObligations] = useState<any[]>([]);

  const { getToken } = useAuth();

  useEffect(() => {
    getDashboardStats().then((r) => setStats(r.data)).catch(() => {});
    
    async function loadUpcoming() {
      try {
        const token = await getToken();
        const r = await getObligations(token, { status: "PENDING" });
        setObligations((r.data || []).slice(0, 5));
      } catch (err) {
        console.error("Erro ao carregar obrigações do dashboard:", err);
      }
    }
    
    loadUpcoming();
  }, [getToken]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile topbar */}
      <MobileHeader onMenuClick={openMenu} title="Dashboard" subtitle={today} />

      {/* Desktop topbar */}
      <PageHeader title="Dashboard" subtitle={today} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* Metric grid — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <MetricCard
            label="Clientes Ativos"
            value={stats?.activeClients ?? "—"}
            icon={Users}
            variant="blue"
            onClick={() => router.push("/dashboard/clients")}
          />
          <MetricCard
            label="Obrigações Pendentes"
            value={stats?.pendingObligations ?? "—"}
            icon={Clock}
            variant="amber"
            onClick={() => router.push("/dashboard/fiscal")}
          />
          <MetricCard
            label="Vencendo Hoje"
            value={stats?.dueTodayObligations ?? "—"}
            icon={AlertTriangle}
            variant="red"
            valueClass={
              stats?.dueTodayObligations > 0 ? "text-red-600" : ""
            }
            onClick={() => router.push("/dashboard/fiscal")}
          />
          <MetricCard
            label="Concluídas no Mês"
            value={stats?.completedThisMonth ?? "—"}
            icon={CheckCircle}
            variant="green"
          />
        </div>

        {/* Upcoming obligations */}
        <SectionHeader
          title="Próximas obrigações"
          linkLabel="Ver todas"
          onLinkClick={() => router.push("/dashboard/fiscal")}
        />

        <Card>
          {obligations.length === 0 && (
            <div className="py-10 text-center text-[13px] text-slate-400">
              Nenhuma obrigação pendente
            </div>
          )}
          {obligations.map((obl, i) => {
            const days = getDaysUntil(obl.dueDate);
            const Icon = oblIcons[obl.type] ?? Receipt;
            const isDas = obl.type === "DAS";
            return (
              <div
                key={obl.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => router.push("/dashboard/fiscal")}
              >
                {/* Icon & Type */}
                <div className="flex items-center gap-3 min-w-0 sm:w-[150px] flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 ${
                      isDas ? "bg-blue-50" : "bg-amber-50"
                    }`}
                  >
                    <Icon size={17} className={isDas ? "text-blue-600" : "text-amber-600"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">
                      {obl.type}
                    </p>
                    <p className="text-[11px] text-slate-400 sm:hidden truncate">
                      {obl.client?.name} · {obl.competenceMonth.toString().padStart(2, "0")}/{obl.competenceYear}
                    </p>
                  </div>
                </div>

                {/* Client Name (Desktop) */}
                <div className="hidden sm:block flex-1 min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Cliente</span>
                  <p className="text-[13px] font-semibold text-slate-700 truncate">
                    {obl.client?.name || "—"}
                  </p>
                </div>

                {/* Competence (Desktop) */}
                <div className="hidden md:block w-32 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Competência</span>
                  <p className="text-[13px] font-semibold text-slate-600">
                    {obl.competenceMonth.toString().padStart(2, "0")}/{obl.competenceYear}
                  </p>
                </div>

                {/* Due Date & Badge */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 flex-shrink-0 sm:w-[160px]">
                  <div className="text-[12px] text-slate-500 sm:text-slate-400">
                    <span className="sm:hidden text-slate-400 text-[11px] block mb-0.5">Vencimento</span>
                    <span className="font-semibold sm:font-normal text-slate-600 sm:text-slate-500">{fmtDate(obl.dueDate)}</span>
                  </div>
                  <div>{daysBadge(days)}</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
