"use client";

/**
 * TrialBanner — exibe dias restantes do período de trial do workspace.
 *
 * Regras visuais:
 *   > 7 dias  → âmbar discreto (informativo)
 *   1–7 dias  → laranja (atenção)
 *   0 dias    → vermelho (urgente / trial vencido)
 *
 * Persistência de fechamento: sessionStorage — some ao fechar a aba,
 * volta a aparecer na próxima sessão.
 *
 * Localização: apps/web/components/dashboard/TrialBanner.tsx
 */

import { useEffect, useState } from "react";
import { AlertTriangle, X, Zap, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface TrialBannerProps {
  trialEndsAt: string | null;
}

function calcDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const SESSION_KEY = "contahub_trial_banner_dismissed";

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const router = useRouter();
  // ready: false até o useEffect confirmar que não foi dismissed
  // Evita flash sem cair na race condition de antes (começar como true)
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    setDismissed(wasDismissed);
    setReady(true);
  }, []);

  const daysLeft = calcDaysLeft(trialEndsAt);

  // Não renderiza enquanto hidratação não confirmar sessionStorage
  // Também não renderiza se: sem data, trial venceu há mais de 1 dia, ou dismissed
  if (!ready || daysLeft === null || daysLeft < -1 || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  // ── Variantes visuais por urgência ───────────────────────────────────────
  const isExpired = daysLeft <= 0;
  const isUrgent  = daysLeft > 0 && daysLeft <= 7;

  const styles = isExpired
    ? {
        wrapper: "bg-red-50 border-red-200",
        icon:    "text-red-500",
        text:    "text-red-800",
        sub:     "text-red-600",
        btn:     "bg-red-600 hover:bg-red-700 text-white",
        close:   "text-red-400 hover:text-red-600",
        Icon:    AlertTriangle,
      }
    : isUrgent
    ? {
        wrapper: "bg-orange-50 border-orange-200",
        icon:    "text-orange-500",
        text:    "text-orange-800",
        sub:     "text-orange-600",
        btn:     "bg-orange-500 hover:bg-orange-600 text-white",
        close:   "text-orange-400 hover:text-orange-600",
        Icon:    Clock,
      }
    : {
        wrapper: "bg-amber-50 border-amber-200",
        icon:    "text-amber-500",
        text:    "text-amber-800",
        sub:     "text-amber-600",
        btn:     "bg-amber-500 hover:bg-amber-600 text-white",
        close:   "text-amber-400 hover:text-amber-600",
        Icon:    Zap,
      };

  const { Icon } = styles;

  const headline = isExpired
    ? "Seu período de teste encerrou"
    : daysLeft === 1
    ? "Último dia de teste!"
    : `${daysLeft} dias restantes no período de teste`;

  const subtext = isExpired
    ? "Assine um plano para continuar usando o ContaHub sem interrupções."
    : isUrgent
    ? "Assine agora e mantenha todo o histórico e dados do seu escritório."
    : "Explore todos os recursos sem limitações. Assine antes do fim do trial.";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b ${styles.wrapper} flex-shrink-0`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={16} className={`flex-shrink-0 ${styles.icon}`} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className={`text-[12.5px] font-semibold leading-snug ${styles.text}`}>
          {headline}
        </p>
        <p className={`text-[11px] leading-snug mt-0.5 ${styles.sub}`}>
          {subtext}
        </p>
      </div>

      <button
        onClick={() => router.push("/dashboard/billing")}
        className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${styles.btn}`}
        aria-label="Ver planos de assinatura"
      >
        Assinar agora
      </button>

      {!isExpired && (
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 transition-colors ${styles.close}`}
          aria-label="Fechar aviso de trial"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}