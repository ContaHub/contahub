// ─── Configuração de Planos — ContaHub ───────────────────────────────────────
// Fonte única de verdade para planos de assinatura.
// Preços em centavos (BRL) — 0 = a definir.
// SEM tabela no banco: mudanças de preço não exigem migration.
// Importado por: apps/api (WorkspaceService) e apps/web (billing page).

export type PlanKey = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthly: number;   // centavos — 0 = a definir
  priceYearly: number;    // centavos — 0 = a definir
  maxClients: number;     // -1 = ilimitado
  maxUsers: number;       // -1 = ilimitado
  features: string[];     // lista de features para exibição
  modules: string[];      // ModuleKeys habilitados no plano
  highlighted: boolean;   // destaque na tela de billing (plano recomendado)
  pricingDefined: boolean;  // ← novo — true quando o valor for o real de produção
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  STARTER: {
    key: 'STARTER',
    name: 'Básico',
    description: 'Para escritórios em crescimento',
    //priceMonthly: 0,
    priceMonthly: 500,  // TEMPORÁRIO — teste de fluxo Asaas — reverter para 0 depois
    priceYearly: 0,
    pricingDefined: true,    
    maxClients: 15,
    maxUsers: 2,
    features: [
      'Até 15 clientes',
      'Até 2 usuários',
      'Gestão de obrigações fiscais',
      'Upload de documentos',
      'Dashboard com métricas',
    ],
    modules: ['CRM', 'FISCAL', 'DOCUMENTS'],
    highlighted: false,
  },

  PRO: {
    key: 'PRO',
    name: 'Pro',
    description: 'Para escritórios estabelecidos',
    priceMonthly: 1000,  // R$ 10,00
    priceYearly: 0,
    pricingDefined: true,
    maxClients: 60,
    maxUsers: 5,
    features: [
      'Até 60 clientes',
      'Até 5 usuários',
      'Tudo do Básico',
      'Portal do cliente',
      'Notificações WhatsApp e e-mail',
      'Consulta automática de CNPJ',
      'Integração e-CAC',
    ],
    modules: ['CRM', 'FISCAL', 'DOCUMENTS', 'COMMUNICATION', 'CLIENT_PORTAL', 'BI'],
    highlighted: true,
  },

  ENTERPRISE: {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Para grandes escritórios',
    priceMonthly: 1500,  // R$ 15,00
    priceYearly: 0,
    pricingDefined: true,
    maxClients: -1,
    maxUsers: -1,
    features: [
      'Clientes ilimitados',
      'Usuários ilimitados',
      'Tudo do Pro',
      'Automações avançadas',
      'BI e relatórios',
      'Suporte prioritário',
      'Onboarding dedicado',
    ],
    modules: ['CRM', 'FISCAL', 'DOCUMENTS', 'COMMUNICATION', 'CLIENT_PORTAL', 'BI', 'FINANCIAL', 'AUTOMATION'],
    highlighted: false,
  },
} as const;

// Helper: retorna config do plano pelo enum do Prisma
export function getPlanConfig(plan: PlanKey): PlanConfig {
  return PLANS[plan];
}

// Helper: formata preço para exibição
export function formatPlanPrice(priceInCents: number): string {
  if (priceInCents === 0) return 'A definir';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceInCents / 100);
}