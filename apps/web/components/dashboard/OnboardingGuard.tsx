"use client";

/**
 * OnboardingGuard — verifica se o workspace precisa de onboarding.
 *
 * Usado no dashboard/page.tsx: se needsOnboarding=true, redireciona
 * para /onboarding antes de renderizar qualquer conteúdo.
 *
 * Localização: apps/web/components/dashboard/OnboardingGuard.tsx
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface OnboardingGuardProps {
  needsOnboarding: boolean;
}

export function OnboardingGuard({ needsOnboarding }: OnboardingGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, router]);

  // Não renderiza nada — só executa o redirect
  return null;
}