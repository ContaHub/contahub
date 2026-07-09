import { SignUpButton } from "@clerk/nextjs";
import {
  Users,
  Receipt,
  MessageCircle,
  FolderOpen,
  ShieldAlert,
  Hash,
  ClipboardList,
  Bell,
  UserCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// ── Benefícios — cores reaproveitadas do padrão já usado em RegimePill/CnpjStatusBadge ──

const BENEFITS = [
  {
    icon: Users,
    title: "Gestão de Clientes",
    description:
      "Cadastre PJ ou PF com busca automática de CNPJ — razão social, endereço e regime tributário preenchidos direto da Receita Federal.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Receipt,
    title: "Obrigações Fiscais",
    description:
      "Controle DAS, DARF e demais obrigações por cliente, com prazos, valores e status sempre visíveis em um único painel.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: MessageCircle,
    title: "Notificações Automáticas",
    description:
      "Alertas de vencimento disparados sozinhos por WhatsApp e/ou e-mail — você escolhe o canal, o sistema cuida do resto.",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    icon: FolderOpen,
    title: "Portal do Cliente",
    description:
      "Seu cliente acessa documentos, aprova relatórios e acompanha obrigações em um portal próprio, sem precisar te ligar.",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    icon: ShieldAlert,
    title: "Monitoramento e-CAC",
    description:
      "Consulta automática de pendências na Receita Federal — débitos, declarações e parcelamentos, sem abrir o portal do governo.",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    icon: Hash,
    title: "Situação Cadastral",
    description:
      "Verificação periódica do CNPJ dos clientes, com alerta imediato se algum ficar inapto, suspenso ou baixado.",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "Cadastre seus clientes",
    description: "Em poucos minutos, com dados preenchidos automaticamente pela Receita Federal.",
  },
  {
    icon: Bell,
    title: "Configure as obrigações",
    description: "Prazos e valores organizados por cliente — o ContaHub cuida dos alertas.",
  },
  {
    icon: UserCheck,
    title: "Centralize a comunicação",
    description: "WhatsApp, e-mail e portal do cliente, tudo vindo do mesmo lugar.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero — com blobs de gradiente suaves, sem perder o fundo branco de base ── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 -left-32 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 mb-6">
            <Sparkles size={12} />
            Feito para escritórios contábeis brasileiros
          </span>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Toda a gestão do seu escritório contábil,{" "}
            <span className="text-blue-600">em um só lugar</span>
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Clientes, obrigações fiscais, documentos, WhatsApp, e-mail e portal do
            cliente — sem planilhas soltas, sem informação espalhada entre sistemas
            diferentes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg shadow-sm shadow-blue-600/20 transition-colors">
                Começar grátis
                <ArrowRight size={16} />
              </button>
            </SignUpButton>
            
              <a href="#como-funciona"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-6 py-3 transition-colors"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ── Benefícios — fundo levemente cinza pra criar contraste de seção ── */}
      <section id="beneficios" className="bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Tudo que seu escritório precisa, integrado
            </h2>
            <p className="text-slate-500 mt-3">
              Cada módulo do ContaHub conversa com os outros — nada de exportar
              planilha de um sistema pra importar em outro.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(({ icon: Icon, title, description, iconBg, iconColor }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona — passos conectados por uma linha, reforçando sequência ── */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Como funciona
          </h2>
          <p className="text-slate-500 mt-3">
            Do cadastro do primeiro cliente ao portal funcionando — sem consultoria,
            sem implantação complicada.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Linha conectora — visível apenas em telas sm+ */}
          <div className="hidden sm:block absolute top-7 left-[16.5%] right-[16.5%] h-px bg-slate-200" />

          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <div key={title} className="relative text-center">
              <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 border-4 border-white mb-4">
                <Icon size={22} className="text-blue-600" />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed max-w-[220px] mx-auto">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final — único "momento" de cor forte da página, faz o fechamento ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-8 py-14 text-center shadow-xl shadow-blue-600/20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Centralize a gestão do seu escritório hoje
          </h2>
          <p className="text-blue-100 mt-3 mb-8">
            Cadastro gratuito, sem cartão de crédito.
          </p>
          <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 px-6 py-3 rounded-lg transition-colors">
              Começar grátis
              <ArrowRight size={16} />
            </button>
          </SignUpButton>
        </div>
      </section>
    </>
  );
}