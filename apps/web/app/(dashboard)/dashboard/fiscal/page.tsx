"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check, Pencil, Trash2, ChevronLeft, ChevronRight, Plus, AlertCircle, CheckCircle, X } from "lucide-react";
import { getObligations, completeObligation, updateObligation, deleteObligation } from "@/lib/fiscal";
import { ObligationModal } from "@/components/fiscal/ObligationModal";
import { PageHeader, Card, Badge, IconButton } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
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
  if (comp.includes("T") || (comp.includes("-") && comp.length > 7)) {
    const d = new Date(comp);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${m}/${d.getFullYear()}`;
  }
  if (/^\d{4}-\d{2}$/.test(comp)) {
    const [y, m] = comp.split("-");
    return `${m}/${y}`;
  }
  return comp;
}

function formatCurrency(value?: number) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

function extractYearMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes("T")) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}/.test(value)) return value.substring(0, 7);
  if (/^\d{2}\/\d{4}$/.test(value)) {
    const [m, y] = value.split("/");
    return `${y}-${m}`;
  }
  return null;
}

// ─── Pill de tipo de obrigação ────────────────────────────────

const OBL_TYPE_COLORS: Record<string, string> = {
  DAS:   "bg-blue-50 text-blue-700 border-blue-100",
  DARF:  "bg-amber-50 text-amber-700 border-amber-100",
  DEFIS: "bg-green-50 text-green-700 border-green-100",
  DCTFWeb: "bg-purple-50 text-purple-700 border-purple-100",
  GFIP:  "bg-rose-50 text-rose-700 border-rose-100",
};

function ObligationTypePill({ type }: { type: string }) {
  const color = OBL_TYPE_COLORS[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${color}`}>
      {type}
    </span>
  );
}

// ─── MonthPicker ─────────────────────────────────────────────

interface MonthPickerProps {
  value: { year: number; month: number } | null;
  onChange: (v: { year: number; month: number } | null) => void;
}

function MonthPicker({ value, onChange }: MonthPickerProps) {
  function prev() {
    if (!value) { const now = new Date(); onChange({ year: now.getFullYear(), month: now.getMonth() + 1 }); return; }
    const m = value.month === 1 ? 12 : value.month - 1;
    const y = value.month === 1 ? value.year - 1 : value.year;
    onChange({ year: y, month: m });
  }
  function next() {
    if (!value) { const now = new Date(); onChange({ year: now.getFullYear(), month: now.getMonth() + 1 }); return; }
    const m = value.month === 12 ? 1 : value.month + 1;
    const y = value.month === 12 ? value.year + 1 : value.year;
    onChange({ year: y, month: m });
  }
  const label = value ? monthLabel(value.year, value.month) : "Todos os meses";

  return (
    <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg bg-white px-1 py-1">
      <button
        onClick={prev}
        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={15} />
      </button>
      <button
        onClick={() => onChange(null)}
        className={`text-[13px] font-medium px-2 min-w-[148px] text-center rounded-md transition-colors ${
          value ? "text-slate-700 hover:text-blue-600" : "text-blue-600"
        }`}
        title={value ? "Clique para ver todos os meses" : "Mostrando todos os meses"}
      >
        {label}
      </button>
      <button
        onClick={next}
        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Status ───────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Pendente",
  COMPLETED:   "Concluída",
  OVERDUE:     "Vencida",
  CANCELED:    "Cancelada",
  IN_PROGRESS: "Comprovante enviado",
};

// Mapeamento para variantes do Badge do design system
const STATUS_BADGE_VARIANT: Record<string, "warning" | "success" | "danger" | "gray" | "info"> = {
  PENDING:     "warning",
  COMPLETED:   "success",
  OVERDUE:     "danger",
  CANCELED:    "gray",
  IN_PROGRESS: "info",
};

// ─── Toast interno ────────────────────────────────────────────

function Toast({ type, message, onClose }: { type: "error" | "success"; message: string; onClose: () => void }) {
  const isError = type === "error";
  return (
    <div className={`flex items-center justify-between text-sm px-4 py-3 rounded-lg mb-4 border ${
      isError
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-green-50 border-green-200 text-green-700"
    }`}>
      <div className="flex items-center gap-2">
        {isError
          ? <AlertCircle size={15} className="flex-shrink-0" />
          : <CheckCircle size={15} className="flex-shrink-0" />}
        {message}
      </div>
      <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────

export default function FiscalPage() {
  const openMenu = useMobileMenu();
  const { getToken } = useAuth();

  const [selectedMonth, setSelectedMonth]     = useState<{ year: number; month: number } | null>(null);
  const [selectedStatus, setSelectedStatus]   = useState<string>("");
  const [selectedClient, setSelectedClient]   = useState<string>("");

  const [obligations, setObligations]         = useState<FiscalObligation[]>([]);
  const [allClients, setAllClients]           = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [completing, setCompleting]           = useState<string | null>(null);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [successMsg, setSuccessMsg]           = useState<string | null>(null);
  const [obligationToDelete, setObligationToDelete] = useState<FiscalObligation | null>(null);
  const [obligationToEdit, setObligationToEdit]     = useState<FiscalObligation | null>(null);

  const monthParam = selectedMonth
    ? `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}`
    : undefined;

  const loadObligations = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getObligations(token, {
        status:   selectedStatus || undefined,
        clientId: selectedClient || undefined,
      });
      const list: FiscalObligation[] = data?.data ?? data ?? [];
      setObligations(list);

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

  useEffect(() => { loadObligations(); }, [loadObligations]);

  const filtered = obligations.filter((o) => {
    if (selectedStatus && o.status !== selectedStatus) return false;
    if (selectedClient && o.clientId !== selectedClient) return false;
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
      setSuccessMsg("Obrigação removida com sucesso.");
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

  const subtitleText = loading
    ? "Carregando..."
    : `${filtered.length} ${filtered.length === 1 ? "obrigação encontrada" : "obrigações encontradas"}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile topbar */}
      <MobileHeader
        onMenuClick={openMenu}
        title="Fiscal"
        subtitle={subtitleText}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={14} />
            Nova
          </button>
        }
      />

      {/* Desktop topbar */}
      <PageHeader
        title="Fiscal"
        subtitle={subtitleText}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={15} />
            Nova obrigação
          </button>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* Toasts */}
        {errorMsg   && <Toast type="error"   message={errorMsg}   onClose={() => setErrorMsg(null)}   />}
        {successMsg && <Toast type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value="">Todos os clientes</option>
            {allClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSelectedMonth(null); setSelectedStatus(""); setSelectedClient(""); }}
              className="flex items-center gap-1 text-[13px] text-slate-400 hover:text-slate-700 transition-colors px-1"
            >
              <X size={13} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        <Card>
          <div className="hidden md:block">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[1.2fr_1.8fr_0.9fr_0.9fr_0.9fr_1fr_100px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {["Obrigação", "Cliente", "Competência", "Vencimento", "Valor", "Status", ""].map((h) => (
                <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">
                  {h}
                </span>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="py-16 text-center text-[13px] text-slate-400">
                Carregando obrigações…
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <CheckCircle size={22} className="text-slate-300" />
                </div>
                <p className="text-[13px] font-semibold text-slate-700 mb-1">
                  Nenhuma obrigação encontrada
                </p>
                <p className="text-[12px] text-slate-400 max-w-[240px]">
                  {hasFilters ? (
                    <>
                      Tente ajustar os filtros ou{" "}
                      <button
                        onClick={() => { setSelectedMonth(null); setSelectedStatus(""); setSelectedClient(""); }}
                        className="text-blue-600 hover:underline"
                      >
                        limpe os filtros
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:underline">
                      crie uma nova obrigação
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* Linhas */}
            {!loading && filtered.map((o) => (
              <div
                key={o.id}
                className="group grid grid-cols-[1.2fr_1.8fr_0.9fr_0.9fr_0.9fr_1fr_100px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                {/* Tipo */}
                <div>
                  <ObligationTypePill type={o.type} />
                </div>

                {/* Cliente */}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900 truncate">
                    {o.client ? getClientDisplayName(o.client) : "—"}
                  </p>
                  {o.client?.cnpj && (
                    <p className="text-[11px] text-slate-400 font-mono truncate">{o.client.cnpj}</p>
                  )}
                </div>

                {/* Competência */}
                <span className="text-[13px] text-slate-600">{formatCompetence(o.competence)}</span>

                {/* Vencimento */}
                <span className="text-[13px] text-slate-600">{formatDate(o.dueDate)}</span>

                {/* Valor */}
                <span className="text-[13px] text-slate-700 font-medium">{formatCurrency(o.value)}</span>

                {/* Status */}
                <div>
                  <Badge variant={STATUS_BADGE_VARIANT[o.status] ?? "gray"}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </Badge>
                </div>

                {/* Ações — IconButton do design system, sem emojis */}
                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {(o.status === "PENDING" || o.status === "OVERDUE" || o.status === "IN_PROGRESS") && (
                    <>
                      <IconButton
                        icon={completing === o.id ? (() => <span className="text-[11px]">…</span>) : Check}
                        label="Concluir obrigação"
                        onClick={() => completing !== o.id && handleComplete(o.id)}
                        variant="success"
                      />
                      <IconButton
                        icon={Pencil}
                        label="Editar obrigação"
                        onClick={() => setObligationToEdit(o)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Remover obrigação"
                        variant="danger"
                        onClick={() => handleDelete(o)}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile — lista de cards */}
          <div className="md:hidden">
            {loading && (
              <div className="py-12 text-center text-[13px] text-slate-400">Carregando…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-[13px] text-slate-400">
                Nenhuma obrigação encontrada.
              </div>
            )}
            {!loading && filtered.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ObligationTypePill type={o.type} />
                    <Badge variant={STATUS_BADGE_VARIANT[o.status] ?? "gray"}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-slate-500 truncate">
                    {o.client ? getClientDisplayName(o.client) : "—"} · {formatDate(o.dueDate)}
                  </p>
                </div>
                {(o.status === "PENDING" || o.status === "OVERDUE" || o.status === "IN_PROGRESS") && (
                  <IconButton icon={Check} label="Concluir" size={13} onClick={() => handleComplete(o.id)} variant="success" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modal de confirmação de exclusão */}
      {obligationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-2">Remover obrigação</h3>
            <p className="text-[13px] text-slate-500 mb-6">
              Deseja remover{" "}
              <span className="font-medium text-slate-700">{obligationToDelete.type}</span> de{" "}
              <span className="font-medium text-slate-700">
                {obligationToDelete.client ? getClientDisplayName(obligationToDelete.client) : "—"}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setObligationToDelete(null)}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação / edição */}
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