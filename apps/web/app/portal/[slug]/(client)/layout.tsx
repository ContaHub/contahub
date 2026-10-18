"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { PortalPermission } from "@contahub/shared";
import {
  PortalClientProvider,
  usePortalClient,
} from "@/components/portal/PortalClientProvider";

// Cada aba e a permissão necessária para vê-la (Início é sempre liberado).
const NAV: { path: string; label: string; permission?: PortalPermission }[] = [
  { path: "dashboard", label: "Início" },
  { path: "documents", label: "Documentos", permission: "VIEW_DOCUMENTS" },
  { path: "reports", label: "Documentos Para Aprovação", permission: "REVIEW_REPORTS" },
  { path: "obligations", label: "Obrigações", permission: "VIEW_OBLIGATIONS" },
];

function PortalShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, loading, can } = usePortalClient();

  const navItems = NAV.filter((item) => !item.permission || can(item.permission)).map(
    (item) => ({ ...item, href: `/portal/${slug}/${item.path}` }),
  );

  // Aba da URL atual e se o cliente não pode abri-la
  const current = NAV.find((item) => pathname.startsWith(`/portal/${slug}/${item.path}`));
  const blocked = !!current?.permission && !can(current.permission);

  // Quem digita a URL de uma aba bloqueada volta para o Início
  useEffect(() => {
    if (!loading && client && blocked) {
      router.replace(`/portal/${slug}/dashboard`);
    }
  }, [loading, client, blocked, router, slug]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-blue-600">ContaHub</span>
            <nav className="flex gap-1" aria-label="Navegação do portal">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserButton afterSignOutUrl={`/portal/${slug}`} />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Carregando">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !client ? (
          <div role="alert" className="bg-white rounded-xl border border-gray-200 text-center py-16 px-6">
            <p className="text-gray-700 font-medium">Não foi possível carregar o seu acesso ao portal</p>
            <p className="text-sm text-gray-400 mt-1">
              Recarregue a página. Se continuar, fale com o seu escritório contábil.
            </p>
          </div>
        ) : blocked ? null : (
          children
        )}
      </main>
    </div>
  );
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <PortalClientProvider slug={slug}>
      <PortalShell slug={slug}>{children}</PortalShell>
    </PortalClientProvider>
  );
}