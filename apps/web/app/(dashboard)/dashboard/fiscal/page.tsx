"use client";

import { useEffect, useState } from "react";
import { Plus, BarChart2, Receipt, Check, Trash2, FileText } from "lucide-react";
import {
  Card, Badge, Button, IconButton,
  FilterBar, SelectFilter, EmptyState, PageHeader,
} from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { ObligationModal } from "@/components/fiscal/ObligationModal";
import { getObligations, completeObligation } from "@/lib/fiscal";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtCurrency(v: number) {
  return v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function obligationIcon(type: string) {
  if (type === "DAS") return { icon: BarChart2, bg: "bg-blue-50", color: "text-blue-600" };
  return { icon: Receipt, bg: "bg-amber-50", color: "text-amber-600" };
}

function statusBadge(s: string) {
  if (s === "PENDING") return <Badge variant="warning">Pendente</Badge>;
  if (s === "COMPLETED") return <Badge variant="success">Concluído</Badge>;
  if (s === "OVERDUE") return <Badge variant="danger">Vencido</Badge>;
  return <Badge variant="gray">{s}</Badge>;
}

export default function FiscalPage() {
  const openMenu = useMobileMenu();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState("all");
  const [obligations, setObligations] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () =>
    getObligations({ month, year, status: status === "all" ? undefined : status })
      .then((r) => setObligations(r.data || []))
      .catch(() => {});

  useEffect(() => { load(); }, [month, year, status]);

  async function handleComplete(id: string) {
    await completeObligation(id);
    load();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader
        onMenuClick={openMenu}
        title="Fiscal"
        subtitle={`${obligations.length} obrigações`}
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Nova
          </Button>
        }
      />
      <PageHeader
        title="Fiscal"
        subtitle={`${obligations.length} obrigações encontradas`}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
            Nova obrigação
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <FilterBar>
          <SelectFilter>{MONTHS[month - 1]} {year}</SelectFilter>
          <SelectFilter>Todos os status</SelectFilter>
          <SelectFilter>Todos os clientes</SelectFilter>
        </FilterBar>

        <Card>
          {/* Desktop */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1.8fr_1.6fr_0.9fr_1fr_1fr_0.9fr_72px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              {["Obrigação","Cliente","Competência","Vencimento","Valor","Status",""].map((h) => (
                <span key={h} className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">{h}</span>
              ))}
            </div>

            {obligations.length === 0 && (
              <EmptyState icon={FileText} title="Nenhuma obrigação" description="Crie obrigações fiscais para seus clientes." />
            )}

            {obligations.map((o) => {
              const { icon: Icon, bg, color } = obligationIcon(o.type);
              return (
                <div
                  key={o.id}
                  className="group grid grid-cols-[1.8fr_1.6fr_0.9fr_1fr_1fr_0.9fr_72px] gap-2 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-900 truncate">{o.type}</span>
                  </div>
                  <span className="text-[13px] text-slate-700 truncate">{o.client?.name || "—"}</span>
                  <span className="text-[13px] text-slate-500">{MONTHS[(o.competenceMonth || 1) - 1].slice(0,3)} {o.competenceYear}</span>
                  <span className="text-[13px] text-slate-500">{fmtDate(o.dueDate)}</span>
                  <span className="text-[13px] font-bold text-slate-900">{fmtCurrency(o.amount)}</span>
                  <span>{statusBadge(o.status)}</span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {o.status === "PENDING" && (
                      <IconButton icon={Check} variant="success" label="Concluir" onClick={() => handleComplete(o.id)} />
                    )}
                    <IconButton icon={Trash2} variant="danger" label="Remover" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {obligations.length === 0 && (
              <EmptyState icon={FileText} title="Nenhuma obrigação" />
            )}
            {obligations.map((o) => {
              const { icon: Icon, bg, color } = obligationIcon(o.type);
              return (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">{o.type}</p>
                    <p className="text-[12px] text-slate-500 truncate">{o.client?.name} · {fmtDate(o.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[12px] font-bold text-slate-800">{fmtCurrency(o.amount)}</span>
                    {statusBadge(o.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {modalOpen && (
        <ObligationModal onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); load(); }} />
      )}
    </div>
  );
}
