import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex items-center p-6 border-b">
          <span className="text-xl font-bold text-blue-600">ContaHub</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            👥 Clientes
          </Link>
          <Link href="/dashboard/fiscal" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            📋 Fiscal
          </Link>
          <Link href="/dashboard/documents" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            📁 Documentos
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            🔔 Notificações
          </Link>
        </nav>
        <div className="p-4 border-t space-y-1">
  <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
    Configurações
  </Link>
  <a
    href="http://localhost:3003/queues"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
  >
    Filas
  </a>
  <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
    <UserButton afterSignOutUrl="/" showName />
  </div>
</div>
      </aside>
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
