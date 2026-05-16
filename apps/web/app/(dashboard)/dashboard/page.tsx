export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Bem-vindo ao ContaHub</p>
      <div className="mt-8 grid grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Clientes Ativos</p><p className="mt-2 text-3xl font-bold">—</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Obrigações Pendentes</p><p className="mt-2 text-3xl font-bold">—</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6"><p className="text-sm text-gray-500">Vencendo Hoje</p><p className="mt-2 text-3xl font-bold text-red-600">—</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Concluídas no Mês</p><p className="mt-2 text-3xl font-bold">—</p></div>
      </div>
    </div>
  );
}
