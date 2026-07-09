import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export const metadata: Metadata = {
  //metadataBase: new URL(APP_URL),
  title: "ContaHub — Gestão para Escritórios de Contabilidade",
  description:
    "Centralize clientes, obrigações fiscais, documentos, WhatsApp, e-mail e portal do cliente em um único sistema feito para escritórios contábeis brasileiros.",
  openGraph: {
    title: "ContaHub — Toda a gestão do seu escritório contábil, em um só lugar",
    description:
      "Clientes, obrigações fiscais, documentos, WhatsApp, e-mail e portal do cliente — sem planilhas soltas.",
    url: APP_URL,
    siteName: "ContaHub",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContaHub — Toda a gestão do seu escritório contábil, em um só lugar",
    description:
      "Clientes, obrigações fiscais, documentos, WhatsApp, e-mail e portal do cliente — sem planilhas soltas.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header público */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold text-slate-900">
            ContaHub
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#beneficios" className="hover:text-slate-900 transition-colors">Benefícios</a>
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Como funciona</a>
          </nav>

          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Entrar
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                  Começar grátis
                </button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Ir para o Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Conteúdo da landing */}
      <main className="flex-1">{children}</main>

      {/* Footer público */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} ContaHub. Todos os direitos reservados.</span>
          <span>Sistema de gestão para escritórios de contabilidade</span>
        </div>
      </footer>
    </div>
  );
}