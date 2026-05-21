"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-blue-600">ContaHub</span>
            <nav className="flex gap-1">
              <Link
                href={`/portal/${slug}/dashboard`}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Início
              </Link>
              <Link
                href={`/portal/${slug}/documents`}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Documentos
              </Link>
              <Link
                href={`/portal/${slug}/obligations`}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Obrigações
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl={`/portal/${slug}`} />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
