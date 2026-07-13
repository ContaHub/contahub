"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Building2, Rocket, CreditCard, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import type { PlanConfig, PlanKey } from "@contahub/shared";

// ── types ─────────────────────────────────────────────────────────────────────

interface PlanData {
  plan: PlanKey;
  status: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  isTrialing: boolean;
  isActive: boolean;
  config: PlanConfig;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanKey, React.ElementType> = {
  STARTER:    Rocket,
  PRO:        Zap,
  ENTERPRISE: Building2,
};

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  if (status === 'TRIAL') {
    const color = (daysLeft ?? 0) <= 3 ? 'bg-red-100 text-red-700' :
                  (daysLeft ?? 0) <= 7 ? 'bg-amber-100 text-amber-700' :
                                         'bg-blue-100 text-blue-700';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        <Clock size={11} />
        Trial — {daysLeft ?? 0} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
      </span>
    );
  }
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <Check size={11} />
        Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
    </span>
  );
}

function PlanCard({
  planKey,
  config,
  isCurrent,
  highlighted,
}: {
  planKey: PlanKey;
  config: PlanConfig;
  isCurrent: boolean;
  highlighted: boolean;
}) {
  const Icon = PLAN_ICONS[planKey];

  return (
    <div className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
      isCurrent
        ? 'border-blue-600 bg-blue-50/40 shadow-md'
        : highlighted
        ? 'border-slate-300 bg-white shadow-sm'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Badge destaque */}
      {highlighted && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Recomendado
          </span>
        </div>
      )}

      {/* Badge plano atual */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Plano atual
          </span>
        </div>
      )}

      {/* Header do card */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">{config.name}</h3>
          <p className="text-[12px] text-slate-500">{config.description}</p>
        </div>
      </div>

      {/* Preço */}
      <div className="mb-5">
        <p className="text-[28px] font-extrabold text-slate-900">
          {config.priceMonthly === 0 ? (
            <span className="text-[20px] text-slate-400 font-semibold">Em breve</span>
          ) : (
            <>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(config.priceMonthly / 100)}
              <span className="text-[13px] font-normal text-slate-400">/mês</span>
            </>
          )}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {config.maxClients === -1 ? 'Clientes ilimitados' : `Até ${config.maxClients} clientes`}
          {' · '}
          {config.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${config.maxUsers} usuários`}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-6">
        {config.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-slate-700">
            <Check size={14} className={`mt-0.5 flex-shrink-0 ${isCurrent ? 'text-blue-600' : 'text-green-500'}`} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div className="w-full py-2.5 rounded-xl bg-blue-600/10 text-blue-700 text-[13px] font-semibold text-center">
          Plano atual
        </div>
      ) : (
        <button
          disabled
          className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 text-[13px] font-medium cursor-not-allowed"
        >
          Em breve
        </button>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const openMenu = useMobileMenu();
  const router   = useRouter();

  const [planData, setPlanData]   = useState<PlanData | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch('/api/workspace/plan')
      .then((r) => r.json())
      .then((json) => setPlanData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Todos os planos para mostrar na tela — importados do shared via API
  const allPlans: { key: PlanKey; config: PlanConfig | null }[] = planData
    ? [
        { key: 'STARTER',    config: planData.plan === 'STARTER'    ? planData.config : null },
        { key: 'PRO',        config: planData.plan === 'PRO'        ? planData.config : null },
        { key: 'ENTERPRISE', config: planData.plan === 'ENTERPRISE' ? planData.config : null },
      ]
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader onMenuClick={openMenu} title="Assinatura" subtitle="Gerencie seu plano" />

      <PageHeader
        title="Assinatura"
        subtitle="Gerencie seu plano e faturamento"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-slate-50">

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !planData ? (
          <div className="text-center py-12 text-slate-500">Erro ao carregar plano.</div>
        ) : (
          <>
            {/* Status atual */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CreditCard size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] text-slate-500">Plano atual</p>
                  <p className="text-[16px] font-bold text-slate-900">{planData.config.name}</p>
                </div>
              </div>
              <StatusBadge status={planData.status} daysLeft={planData.trialDaysLeft} />
            </div>

            {/* Cards de planos — busca configs via API route */}
            <PlansGrid currentPlan={planData.plan} currentConfig={planData.config} />

            {/* Card informativo */}
            <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[13px] font-semibold text-slate-700 mb-1">Precisa de ajuda?</p>
              <p className="text-[12px] text-slate-500">
                Os planos pagos estarão disponíveis em breve. Durante o trial você tem acesso a todos os recursos.
                Em caso de dúvidas, entre em contato pelo suporte.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Componente separado que busca todos os planos via API route
function PlansGrid({ currentPlan, currentConfig }: { currentPlan: PlanKey; currentConfig: PlanConfig }) {
  const [plans, setPlans] = useState<Record<PlanKey, PlanConfig> | null>(null);

  useEffect(() => {
    fetch('/api/workspace/plans')
      .then((r) => r.json())
      .then((json) => setPlans(json.plans))
      .catch(() => {});
  }, []);

  if (!plans) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {['STARTER', 'PRO', 'ENTERPRISE'].map((k) => (
          <div key={k} className="h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
      {(['STARTER', 'PRO', 'ENTERPRISE'] as PlanKey[]).map((key) => (
        <PlanCard
          key={key}
          planKey={key}
          config={plans[key]}
          isCurrent={currentPlan === key}
          highlighted={plans[key].highlighted}
        />
      ))}
    </div>
  );
}