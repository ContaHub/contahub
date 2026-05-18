"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getObligations, completeObligation,
  FiscalObligation, OBLIGATION_LABELS, STATUS_CONFIG,
  MONTHS, formatCurrency, formatDateBR,
} from "@/lib/fiscal";
import { ObligationModal } from "@/components/fiscal/ObligationModal";

// Retorna ícone por tipo de obrigação
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    DARF: "💰", DAS: "📊", DEFIS: "📄", SPED_CONTABIL: "📚",
    SPED_FISCAL: "📋", ESOCIAL: "👥", DIRF: "📑", RAIS: "📃",
    REINF: "🔄", DCTF: "📝",
  };
  return icons[type] || "📌";
}

export default function FiscalPage() {
  const [obligations, setObligations] = useState<FiscalObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Filtros
  const now = new Date();
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());

  const fetchObligations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getObligations({
        status: statusFilter || undefined,
        month: monthFilter,
        year: yearFilter,
      });
      setObligations(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, yearFilter]);

  useEffect(() => { fetchObligations(); }, [fetchObligations]);

  async function handleComplete(id: string) {
    setCompleting(id);
    try {
      await completeObligation(id);
      fetchObligations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(null);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Carregando..." : `${obligations.length} ${obligations.length !== 1 ? "obrigações encontradas" : "obrigação encontrada"}`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova obrigação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500 font-medium">Nenhuma obrigação encontrada</p>
            <p className="text-gray-400 text-sm mt-1">
              {MONTHS[monthFilter - 1]} de {yearFilter}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4 pl-6">Obrigação</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Competência</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Status</th>
                  <th className="pb-3 pt-4 pr-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {obligations.map((ob) => {
                  const status = STATUS_CONFIG[ob.status];
                  const isPending = ob.status === "PENDING" || ob.status === "IN_PROGRESS";
                  return (
                    <tr key={ob.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Tipo */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getTypeIcon(ob.type)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {OBLIGATION_LABELS[ob.type] || ob.type}
                          </span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-4">
                        <p className="text-sm text-gray-700">{ob.client.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{ob.client.cnpj}</p>
                      </td>

                      {/* Competência */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {MONTHS[ob.competenceMonth - 1]?.slice(0, 3)} {ob.competenceYear}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">{formatDateBR(ob.dueDate)}</span>
                      </td>

                      {/* Valor */}
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {ob.amount ? formatCurrency(ob.amount) : "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.class}`}>
                          {status?.label}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-4 pr-6">
                        {isPending && (
                          <button
                            onClick={() => handleComplete(ob.id)}
                            disabled={completing === ob.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50"
                          >
                            {completing === ob.id ? "..." : "✓ Concluir"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ObligationModal
          onClose={() => setModalOpen(false)}
          onSuccess={fetchObligations}
        />
      )}
    </div>
  );
}
