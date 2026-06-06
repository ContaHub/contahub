"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const navItems = [
    { href: `/portal/${slug}/dashboard`, label: "Início" },
    { href: `/portal/${slug}/documents`, label: "Documentos" },
    { href: `/portal/${slug}/reports`, label: "Documentos Para Aprovação" },
    { href: `/portal/${slug}/obligations`, label: "Obrigações" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-blue-600">ContaHub</span>
            <nav className="flex gap-1">
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
        {children}
      </main>
    </div>
  );
}
