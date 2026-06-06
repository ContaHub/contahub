"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { getObligations, completeObligation, updateObligation, deleteObligation } from "@/lib/fiscal";
import { ObligationModal } from "@/components/fiscal/ObligationModal";
import { getClientDisplayName } from "@contahub/shared";

// ─── Tipos ───────────────────────────────────────────────────
interface FiscalObligation {
  id: string;
  type: string;
  clientId: string;
  client?: { name: string; cnpj?: string; cpf?: string };
  competence: string;
  dueDate: string;
  value?: number;
  status: string;
  notes?: string;
}

// ─── Helpers ─────────────────────────────────────────────────
const PT_MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function monthLabel(year: number, month: number) {
  return `${PT_MONTHS[month - 1]} ${year}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("pt-BR"); }
  catch { return dateStr; }
}

function formatCompetence(comp: string) {
  if (!comp) return "—";
  // ISO: "2026-01-01T..." → "01/2026"
  if (comp.includes("T") || (comp.includes("-") && comp.length > 7)) {
    const d = new Date(comp);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${m}/${d.getFullYear()}`;
  }
  // "2026-01" → "01/2026"
  if (/^\d{4}-\d{2}$/.test(comp)) {
    const [y, m] = comp.split("-");
    return `${m}/${y}`;
  }
  // Já está em "01/2026"
  return comp;
}

function formatCurrency(value?: number) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

/**
 * Extrai "YYYY-MM" de qualquer formato de data/competência.
 * Aceita: ISO datetime, "2026-01", "01/2026", "2026-01-01"
 * Retorna null se não conseguir parsear.
 */
function extractYearMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  // ISO datetime: "2026-01-15T00:00:00.000Z"
  if (value.includes("T")) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  // "2026-01-15" ou "2026-01"
  if (/^\d{4}-\d{2}/.test(value)) {
    return value.substring(0, 7); // pega só "YYYY-MM"
  }
  // "01/2026"
  if (/^\d{2}\/\d{4}$/.test(value)) {
    const [m, y] = value.split("/");
    return `${y}-${m}`;
  }
  return null;
}

// ─── MonthPicker ─────────────────────────────────────────────
interface MonthPickerProps {
  value: { year: number; month: number } | null;
  onChange: (v: { year: number; month: number } | null) => void;
}

function MonthPicker({ value, onChange }: MonthPickerProps) {
  function prev() {
    if (!value) {
      const now = new Date();
      onChange({ year: now.getFullYear(), month: now.getMonth() + 1 });
      return;
    }
    const m = value.month === 1 ? 12 : value.month - 1;
    const y = value.month === 1 ? value.year - 1 : value.year;
    onChange({ year: y, month: m });
  }
  function next() {
    if (!value) {
      const now = new Date();
      onChange({ year: now.getFullYear(), month: now.getMonth() + 1 });
      return;
    }
    const m = value.month === 12 ? 1 : value.month + 1;
    const y = value.month === 12 ? value.year + 1 : value.year;
    onChange({ year: y, month: m });
  }
  const label = value ? monthLabel(value.year, value.month) : "Todos os meses";

  return (
    <div className="flex items-center gap-1 border border-gray-300 rounded-lg bg-white px-1 py-1.5">
      <button onClick={prev} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Mês anterior">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => onChange(null)}
        className={`text-sm font-medium px-2 min-w-[140px] text-center rounded transition-colors ${
          value ? "text-gray-700 hover:text-blue-600" : "text-blue-600"
        }`}
        title={value ? "Clique para ver todos os meses" : "Mostrando todos os meses"}
      >
        {label}
      </button>
      <button onClick={next} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Próximo mês">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Labels / estilos ────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Pendente",
  COMPLETED: "Concluída",
  OVERDUE:   "Vencida",
  CANCELED:  "Cancelada",
  IN_PROGRESS: "Comprovante enviado",
};
const STATUS_CLASSES: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  OVERDUE:   "bg-red-100 text-red-800",
  CANCELED:  "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
};

// ─── Página ───────────────────────────────────────────────────
export default function FiscalPage() {
  const { getToken } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [selectedStatus, setSelectedStatus]   = useState<string>("");
  const [selectedClient, setSelectedClient]   = useState<string>("");

  const [obligations, setObligations] = useState<FiscalObligation[]>([]);
  const [allClients, setAllClients]   = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [completing, setCompleting]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [obligationToDelete, setObligationToDelete] = useState<FiscalObligation | null>(null);
  const [obligationToEdit, setObligationToEdit]     = useState<FiscalObligation | null>(null);

  const monthParam = selectedMonth
    ? `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}`
    : undefined;

  const loadObligations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      // Busca SEMPRE sem filtro de mês na API (filtro feito no front)
      // Isso garante que obrigações com competence em formatos variados
      // sejam todas retornadas e filtradas corretamente aqui.
      const data = await getObligations(token, {
        status:   selectedStatus || undefined,
        clientId: selectedClient || undefined,
      });
      const list: FiscalObligation[] = data?.data ?? data ?? [];
      setObligations(list);

      // Clientes únicos para o select
      setAllClients((prev) => {
        const merged = new Map(prev.map((c) => [c.id, c.name]));
        list.forEach((o) => {
          if (o.client) merged.set(o.clientId, getClientDisplayName(o.client));
        });
        return Array.from(merged.entries()).map(([id, name]) => ({ id, name }));
      });
    } catch (err) {
      console.error("Erro ao carregar obrigações:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, selectedStatus, selectedClient]);

  useEffect(() => {
    loadObligations();
  }, [loadObligations]);

  // ─── Filtro local (robusto para qualquer formato de data) ──
  const filtered = obligations.filter((o) => {
    // Filtro status
    if (selectedStatus && o.status !== selectedStatus) return false;
    // Filtro cliente
    if (selectedClient && o.clientId !== selectedClient) return false;
    // Filtro mês — usa competence; fallback para dueDate
    if (monthParam) {
      const compYM = extractYearMonth(o.competence) ?? extractYearMonth(o.dueDate);
      if (!compYM || compYM !== monthParam) return false;
    }
    return true;
  });

async function handleDelete(o: FiscalObligation) {
  setObligationToDelete(o);
}

async function confirmDelete() {
  if (!obligationToDelete) return;
  try {
    const token = await getToken();
    await deleteObligation(obligationToDelete.id, token);
    setSuccessMsg("Obrigação removida.");
    setTimeout(() => setSuccessMsg(null), 4000);
    setObligationToDelete(null);
    await loadObligations();
  } catch (err: any) {
    setErrorMsg(err?.message ?? "Erro ao remover obrigação.");
    setTimeout(() => setErrorMsg(null), 5000);
    setObligationToDelete(null);
  }
}  

async function handleComplete(id: string) {
  setCompleting(id);
  setErrorMsg(null);
  setSuccessMsg(null);
  try {
    const token = await getToken();
    await completeObligation(id, token);
    setSuccessMsg("Obrigação concluída com sucesso!");
    setTimeout(() => setSuccessMsg(null), 4000);
    await loadObligations();
  } catch (err: any) {
    setErrorMsg(err?.message ?? "Erro ao concluir obrigação.");
    setTimeout(() => setErrorMsg(null), 5000);
  } finally {
    setCompleting(null);
  }
}

  const hasFilters = selectedMonth !== null || !!selectedStatus || !!selectedClient;

  return (
    <div className="p-6">
      {/* Toast de erro */}
      {errorMsg && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Toast de sucesso */}
      {successMsg && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600 ml-4">✕</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? "Carregando..."
              : `${filtered.length} obrigação(ões) encontrada(s)`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nova obrigação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os clientes</option>
          {allClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSelectedMonth(null); setSelectedStatus(""); setSelectedClient(""); }}
            className="text-sm text-gray-400 hover:text-gray-700 underline px-1 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Obrigação","Cliente","Competência","Vencimento","Valor","Status",""].map((h, i) => (
                <th key={i} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                  Carregando obrigações...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium">Nenhuma obrigação encontrada</p>
                    <p className="text-xs">
                      {hasFilters ? (
                        <>Tente ajustar os filtros ou{" "}
                          <button
                            onClick={() => { setSelectedMonth(null); setSelectedStatus(""); setSelectedClient(""); }}
                            className="text-blue-600 hover:underline"
                          >limpe os filtros</button>
                        </>
                      ) : (
                        <button onClick={() => setShowModal(true)} className="text-blue-600 hover:underline">
                          crie uma nova obrigação
                          </button>
                        )}
                     </p>
                    </div>
                  </td>
                </tr>
              ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {o.client ? getClientDisplayName(o.client) : "—"}
                    {o.client?.cnpj && <span className="block text-xs text-gray-400">{o.client.cnpj}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatCompetence(o.competence)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(o.dueDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(o.value)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${STATUS_CLASSES[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      {(o.status === "PENDING" ||
                        o.status === "OVERDUE" ||
                        o.status === "IN_PROGRESS") && (
                        <>
                          <button
                            onClick={() => handleComplete(o.id)}
                            disabled={completing === o.id}
                            className="text-xs text-green-700 hover:text-green-900 font-medium border border-green-300 hover:border-green-500 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {completing === o.id ? "..." : "✓ Concluir"}
                          </button>

                          <button
                            onClick={() => setObligationToEdit(o)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => handleDelete(o)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )
            )}
          </tbody>
        </table>
      </div>
      {obligationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Remover obrigação</h3>
            <p className="text-sm text-gray-500 mb-6">
              Deseja remover <span className="font-medium text-gray-700">{obligationToDelete.type}</span> de{" "}
              <span className="font-medium text-gray-700">{obligationToDelete.client ? getClientDisplayName(obligationToDelete.client) : "—"}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setObligationToDelete(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
      {(showModal || obligationToEdit) && (
        <ObligationModal
          obligation={obligationToEdit ?? undefined}
          onClose={() => { setShowModal(false); setObligationToEdit(null); }}
          onSuccess={() => { setShowModal(false); setObligationToEdit(null); loadObligations(); }}
        />
      )}
    </div>
  );
}
