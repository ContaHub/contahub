"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { createObligation, updateObligation, OBLIGATION_LABELS, MONTHS } from "@/lib/fiscal";
import { getClients, Client } from "@/lib/clients";

interface FiscalObligation {
  id: string;
  type: string;
  clientId: string;
  client?: { name: string };
  competence: string;
  dueDate: string;
  value?: number;
  status: string;
  notes?: string;
}

interface ObligationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  obligation?: FiscalObligation; // se passado, modo edição
}

export function ObligationModal({ onClose, onSuccess, obligation }: ObligationModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  const isEdit = !!obligation;
  const now = new Date();

  // Extrai mês/ano da competence no formato "YYYY-MM" ou ISO
  function parseCompetence(comp: string) {
    if (!comp) return { month: now.getMonth() + 1, year: now.getFullYear() };
    if (comp.includes("T")) {
      const d = new Date(comp);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
    if (/^\d{4}-\d{2}/.test(comp)) {
      const [y, m] = comp.split("-");
      return { month: Number(m), year: Number(y) };
    }
    if (/^\d{2}\/\d{4}$/.test(comp)) {
      const [m, y] = comp.split("/");
      return { month: Number(m), year: Number(y) };
    }
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  function parseDueDate(d: string) {
    if (!d) return "";
    try { return new Date(d).toISOString().split("T")[0]; }
    catch { return ""; }
  }

  const comp = obligation ? parseCompetence(obligation.competence) : null;

  const [form, setForm] = useState({
    clientId:        obligation?.clientId ?? "",
    type:            obligation?.type ?? "DAS",
    competenceMonth: comp?.month ?? now.getMonth() + 1,
    competenceYear:  comp?.year  ?? now.getFullYear(),
    dueDate:         obligation ? parseDueDate(obligation.dueDate) : "",
    amount:          obligation?.value != null ? (obligation.value / 100).toFixed(2) : "",
    notes:           obligation?.notes ?? "",
  });

  useEffect(() => {
    getClients({ limit: 100 }).then((res) => setClients(res.data));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const payload = {
        clientId:        form.clientId,
        type:            form.type,
        competenceMonth: Number(form.competenceMonth),
        competenceYear:  Number(form.competenceYear),
        dueDate:         new Date(form.dueDate).toISOString(),
        amount:          form.amount ? Math.round(Number(form.amount) * 100) : undefined,
        notes:           form.notes || undefined,
      };

      if (isEdit) {
        await updateObligation(obligation.id, payload, token);
      } else {
        await createObligation(payload, token);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Editar Obrigação Fiscal" : "Nova Obrigação Fiscal"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              required
              disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.tradeName}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Obrigação *</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(OBLIGATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label as string}</option>
              ))}
            </select>
          </div>

          {/* Competência */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Competência *</label>
              <select
                name="competenceMonth"
                value={form.competenceMonth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m: string, i: number) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
              <select
                name="competenceYear"
                value={form.competenceYear}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Vencimento *</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input
                type="text"
                name="amount"
                value={form.amount}
                onChange={(e) => {
                  // Permite apenas números, ponto e vírgula
                  const raw = e.target.value.replace(/[^\d.,]/g, "");
                  setForm((prev) => ({ ...prev, amount: raw }));
                }}
                onBlur={(e) => {
                  // Ao sair do campo, formata com 2 casas decimais
                  const num = parseFloat(e.target.value.replace(",", "."));
                  if (!isNaN(num)) {
                    setForm((prev) => ({ ...prev, amount: num.toFixed(2) }));
                  }
                }}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
              {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar obrigação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}