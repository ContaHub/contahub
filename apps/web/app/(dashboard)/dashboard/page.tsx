"use client";

import { useEffect, useState, useCallback } from "react";
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
import { useAuth } from "@clerk/nextjs";
import { getDashboardStats } from "@/lib/dashboard";
import { getObligations } from "@/lib/fiscal";
import { getDocuments } from "@/lib/documents";
import { getClientDisplayName } from "@contahub/shared";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { OnboardingGuard } from "@/components/dashboard/OnboardingGuard";

// ---------- helpers ----------

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(date: string) {
  return Math.round(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return <Badge variant="danger">Vencido</Badge>;
  if (days === 0) return <Badge variant="danger">Hoje</Badge>;
  if (days <= 7) return <Badge variant="warning">{days} dias</Badge>;
  return <Badge variant="success">{days} dias</Badge>;
}

const oblIcons: Record<string, React.ElementType> = {
  DAS: BarChart2,
  DARF: Receipt,
};

// ---------- sub-componentes locais ----------

const SPARK_OBLIGATIONS = "0,52 18,44 36,48 54,36 72,40 90,24 108,30 126,18 144,28 162,12 180,20 198,8";
const SPARK_DOCUMENTS   = "0,56 18,50 36,54 54,42 72,46 90,34 108,38 126,26 144,32 162,18 180,24 198,14";
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

function Sparkline({ points, color, fillId }: { points: string; color: string; fillId: string }) {
  const lastPt = points.trim().split(" ").pop()!;
  const lastX = lastPt.split(",")[0];
  const lastY = lastPt.split(",")[1];
  const fillPath = `M0,60 L${points.replace(/(\d+),(\d+)/g, "L$1,$2").slice(1)} L${lastX},60 Z`;

  return (
    <div aria-hidden="true">
      <svg width="100%" height="56" viewBox="0 0 198 60" preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${fillId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastX} cy={lastY} r="3" fill={color} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {MONTHS.map((m) => (
          <span key={m} style={{ fontSize: 10, color: "#94a3b8", fontFamily: "sans-serif", lineHeight: 1 }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendCard({ label, value, sub, points, sparkColor, fillId }: {
  label: string; value: string; sub: string;
  points: string; sparkColor: string; fillId: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{label}</p>
      <p className="text-[18px] font-extrabold text-slate-900 mb-0.5">{value}</p>
      <p className="text-[11px] text-slate-400 mb-3">{sub}</p>
      <Sparkline points={points} color={sparkColor} fillId={fillId} />
    </div>
  );
}

function AlertRow({ color, text, sub }: { color: "red" | "amber" | "blue"; text: string; sub: string }) {
  const dotColor = { red: "bg-red-500", amber: "bg-amber-400", blue: "bg-blue-400" }[color];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 last:pb-0">
      <span className={`w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0 ${dotColor}`} />
      <div className="min-w-0">
        <p className="text-[12.5px] text-slate-800 leading-snug">{text}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function DashboardPage() {
  const openMenu = useMobileMenu();
  const router = useRouter();
  const { getToken } = useAuth();

  const [stats, setStats]           = useState<any>(null);
  const [obligations, setObligations] = useState<any[]>([]);
  const [docsLast30, setDocsLast30]  = useState<number | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  // ── NOVO: onboarding ──────────────────────────────────────────────────────
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const load = useCallback(async () => {
    getDashboardStats().then((r) => setStats(r.data)).catch(() => {});

    try {
      const token = await getToken();

      const [oblRes, docRes] = await Promise.all([
        getObligations(token, { status: "PENDING" }),
        getDocuments(),
      ]);
      setObligations(oblRes.data || []);

      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = (docRes.data || []).filter(
        (d) => new Date(d.createdAt).getTime() >= cutoff
      );
      setDocsLast30(recent.length);

      // Busca settings — retorna trialEndsAt e needsOnboarding
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
        const wsRes = await fetch(`${API_URL}/api/v1/workspace/settings`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setTrialEndsAt(wsData.data?.trialEndsAt ?? null);
          // Se needsOnboarding=true, o OnboardingGuard dispara o redirect
          setNeedsOnboarding(wsData.data?.needsOnboarding ?? false);
        }
      } catch {
        // Silencia — não quebra o dashboard
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const urgentObligations = obligations.filter((o) => getDaysUntil(o.dueDate) <= 7);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Redireciona para /onboarding se workspace ainda não foi configurado */}
      <OnboardingGuard needsOnboarding={needsOnboarding} />

      <TrialBanner trialEndsAt={trialEndsAt} />

      {/* Mobile topbar */}
      <MobileHeader onMenuClick={openMenu} title="Dashboard" subtitle={today} />

      {/* Desktop header */}
      <div className="hidden sm:flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div>
          <h1 className="text-[18px] font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-[12px] text-slate-400 mt-0.5 capitalize">{today}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-slate-50">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <MetricCard label="Clientes Ativos" value={stats?.activeClients ?? "—"} icon={Users} variant="blue" onClick={() => router.push("/dashboard/clients")} />
          <MetricCard label="Obrigações Pendentes" value={stats?.pendingObligations ?? "—"} icon={Clock} variant="amber" onClick={() => router.push("/dashboard/fiscal")} />
          <MetricCard label="Vencendo Hoje" value={stats?.dueTodayObligations ?? "—"} icon={AlertTriangle} variant="red" valueClass={stats?.dueTodayObligations > 0 ? "text-red-600" : ""} onClick={() => router.push("/dashboard/fiscal")} />
          <MetricCard label="Concluídas no Mês" value={stats?.completedThisMonth ?? "—"} icon={CheckCircle} variant="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-4">

          <div>
            <SectionHeader title="Próximas obrigações" linkLabel="Ver todas" onLinkClick={() => router.push("/dashboard/fiscal")} />
            <Card>
              {obligations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                    <CheckCircle size={22} className="text-green-500" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-700 mb-1">Tudo em dia!</p>
                  <p className="text-[12px] text-slate-400 max-w-[240px]">
                    Nenhuma obrigação pendente por agora. Quando houver, ela aparecerá aqui.
                  </p>
                </div>
              )}
              {obligations.slice(0, 3).map((obl) => {
                const days = getDaysUntil(obl.dueDate);
                const Icon = oblIcons[obl.type] ?? Receipt;
                const isDas = obl.type === "DAS";
                return (
                  <div key={obl.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push("/dashboard/fiscal")}>
                    <div className="flex items-center gap-3 min-w-0 sm:w-[150px] flex-shrink-0">
                      <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 ${isDas ? "bg-blue-50" : "bg-amber-50"}`}>
                        <Icon size={17} className={isDas ? "text-blue-600" : "text-amber-600"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{obl.type}</p>
                        <p className="text-[11px] text-slate-400 sm:hidden truncate">
                          {obl.client ? getClientDisplayName(obl.client) : "—"} · {obl.competenceMonth.toString().padStart(2, "0")}/{obl.competenceYear}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-0">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Cliente</span>
                      <p className="text-[13px] font-semibold text-slate-700 truncate">{obl.client ? getClientDisplayName(obl.client) : "—"}</p>
                    </div>
                    <div className="hidden md:block w-28 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Competência</span>
                      <p className="text-[13px] text-slate-600">{obl.competenceMonth.toString().padStart(2, "0")}/{obl.competenceYear}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 flex-shrink-0 sm:w-[140px]">
                      <span className="text-[12px] text-slate-500">{fmtDate(obl.dueDate)}</span>
                      <DaysBadge days={days} />
                    </div>
                  </div>
                );
              })}
              {obligations.length > 3 && (
                <button onClick={() => router.push("/dashboard/fiscal")} className="w-full flex items-center justify-center gap-2 py-3 text-[12px] text-blue-600 hover:bg-blue-50 transition-colors rounded-b-xl border-t border-slate-100">
                  Ver mais {obligations.length - 3} obrigação{obligations.length - 3 !== 1 ? "ões" : ""} pendente{obligations.length - 3 !== 1 ? "s" : ""}
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{obligations.length - 3}</span>
                </button>
              )}
            </Card>
          </div>

          <div>
            <SectionHeader title="Alertas e atividade" />
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              {urgentObligations.length > 0 ? (
                urgentObligations.map((o) => {
                  const days = getDaysUntil(o.dueDate);
                  const clientName = o.client ? getClientDisplayName(o.client) : "Cliente";
                  return <AlertRow key={o.id} color={days <= 1 ? "red" : "amber"} text={`${clientName} — ${o.type} vence em ${days} dia${days !== 1 ? "s" : ""}`} sub="Notificação WhatsApp pendente" />;
                })
              ) : (
                <AlertRow color="blue" text="Nenhuma obrigação urgente" sub="Todos os prazos estão sob controle" />
              )}
              <AlertRow color="amber" text="Documento aguardando aprovação" sub="Acesse Documentos para revisar" />
              <AlertRow color="blue" text="Workers BullMQ ativos" sub="FiscalReminderWorker — próxima varredura: 08h" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TrendCard label="Obrigações concluídas — 30 dias" value={`${stats?.completedThisMonth ?? "—"} este mês`} sub="Tendência de produtividade" points={SPARK_OBLIGATIONS} sparkColor="#2563EB" fillId="spark-blue" />
          <TrendCard label="Documentos recebidos — 30 dias" value={docsLast30 !== null ? `${docsLast30} documento${docsLast30 !== 1 ? "s" : ""}` : "—"} sub={docsLast30 !== null ? "Últimos 30 dias" : "Carregando..."} points={SPARK_DOCUMENTS} sparkColor="#1D9E75" fillId="spark-green" />
        </div>

      </div>
    </div>
  );
}