"use client";

import { useEffect, useState } from "react";
import { X, Loader2, UserCircle, Building2 } from "lucide-react";
import { createClientFree, updateClient } from "@/lib/clients";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ClientType = "PJ" | "PF";

type TaxRegime =
  | "SIMPLES_NACIONAL"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL"
  | "MEI"
  | "ISENTO";

interface ClientFreeForm {
  type: ClientType;
  name: string;
  tradeName: string;
  /** Identificação livre — CNPJ, CPF, passaporte, código interno, etc. */
  identifier: string;
  taxRegime: TaxRegime | "";
  email: string;
  phone: string;
  address: string;
  notes: string;
  portalEnabled: boolean;
  portalEmail: string;
}

interface ClientModalFreeProps {
  /** Passa um cliente para modo edição; undefined para criação */
  client?: {
    id: string;
    name: string;
    tradeName?: string | null;
    cnpj?: string | null;         // reutilizamos o campo cnpj do banco para armazenar o identificador
    type?: ClientType;
    taxRegime?: TaxRegime | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TAX_REGIME_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: "SIMPLES_NACIONAL", label: "Simples Nacional" },
  { value: "LUCRO_PRESUMIDO",  label: "Lucro Presumido"  },
  { value: "LUCRO_REAL",       label: "Lucro Real"        },
  { value: "MEI",              label: "MEI"               },
  { value: "ISENTO",           label: "Isento / Não aplicável" },
];

const EMPTY_FORM: ClientFreeForm = {
  type:       "PJ",
  name:       "",
  tradeName:  "",
  identifier: "",
  taxRegime:  "",
  email:      "",
  phone:      "",
  address:    "",
  notes:      "",
  portalEnabled: false,
  portalEmail:  "",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ClientModalFree({ client, onClose, onSuccess }: ClientModalFreeProps) {
  const isEdit = !!client;

  const [form, setForm] = useState<ClientFreeForm>(() =>
    client
      ? {
          type:       client.type       ?? "PJ",
          name:       client.name       ?? "",
          tradeName:  client.tradeName  ?? "",
          identifier: client.cnpj       ?? "",   // campo cnpj do banco = identificador livre
          taxRegime:  client.taxRegime  ?? "",
          email:      client.email      ?? "",
          phone:      client.phone      ?? "",
          address:    client.address    ?? "",
          notes:      client.notes      ?? "",
          portalEnabled: false,   // edição não expõe portal aqui — usuário habilita conscientemente
          portalEmail:   "",
        }
      : EMPTY_FORM,
  );

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = <K extends keyof ClientFreeForm>(key: K, value: ClientFreeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const identifierLabel = form.type === "PJ"
    ? "Identificação (CNPJ, código interno, etc.)"
    : "Identificação (CPF, passaporte, código interno, etc.)";

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError("");

    if (!form.name.trim()) {
      setError("O nome / razão social é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        //type:       form.type,
        name:       form.name.trim(),
        tradeName:  form.tradeName.trim()  || undefined,
        cnpj:       form.identifier.trim(),  // salva no campo cnpj do banco
        taxRegime:  form.taxRegime,
        email:      form.email.trim()      || undefined,
        phone:      form.phone.trim()      || undefined,
        address:    form.address.trim()    || undefined,
        notes:      form.notes.trim()      || undefined,
        portalEnabled: form.portalEnabled,
        ...(form.portalEnabled && form.portalEmail.trim()
        ? { portalEmail: form.portalEmail.trim() }
        : {}),
      };

      if (isEdit) {
        await updateClient(client!.id, payload);
      } else {
        await createClientFree(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar cliente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-free-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-free-title" className="text-base font-semibold text-gray-900">
            {isEdit ? "Editar cliente" : "Novo cliente — identificação livre"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Toggle PJ / PF */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Tipo de pessoa
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["PJ", "PF"] as ClientType[]).map((t) => {
                const Icon = t === "PJ" ? Building2 : UserCircle;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                      form.type === t
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={15} />
                    {t === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome / Razão Social */}
          <div>
            <label htmlFor="free-name" className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "PJ" ? "Razão Social" : "Nome completo"} <span className="text-red-500">*</span>
            </label>
            <input
              id="free-name"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={form.type === "PJ" ? "Ex: Tech Solutions Ltda" : "Ex: João da Silva"}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label htmlFor="free-tradename" className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "PJ" ? "Nome Fantasia" : "Apelido / Nome social"}
            </label>
            <input
              id="free-tradename"
              type="text"
              value={form.tradeName}
              onChange={(e) => set("tradeName", e.target.value)}
              placeholder="Ex: TechSolutions"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Identificação — campo livre */}
          <div>
            <label htmlFor="free-identifier" className="block text-sm font-medium text-gray-700 mb-1">
              {identifierLabel}
            </label>
            <input
              id="free-identifier"
              type="text"
              value={form.identifier}
              onChange={(e) => set("identifier", e.target.value)}
              placeholder="Qualquer texto ou número — sem formatação obrigatória"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
            />
            <p className="mt-1 text-xs text-gray-400">
              Aceita CNPJ, CPF, passaporte, código interno — qualquer formato alfanumérico.
            </p>
          </div>

          {/* Regime Tributário */}
          <div>
            <label htmlFor="free-regime" className="block text-sm font-medium text-gray-700 mb-1">
              Regime tributário
            </label>
            <select
              id="free-regime"
              value={form.taxRegime}
              onChange={(e) => set("taxRegime", e.target.value as TaxRegime | "")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
            >
              <option value="">Selecione (opcional)</option>
              {TAX_REGIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* E-mail */}
          <div>
            <label htmlFor="free-email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="free-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contato@empresa.com.br"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="free-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefone / WhatsApp
            </label>
            <input
              id="free-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(11) 91234-5678"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Endereço */}
          <div>
            <label htmlFor="free-address" className="block text-sm font-medium text-gray-700 mb-1">
              Endereço
            </label>
            <input
              id="free-address"
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Rua, número, bairro, cidade — UF"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="free-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              id="free-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Informações adicionais sobre o cliente..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

        {/* Portal do Cliente */}
        <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Portal do Cliente
        </p>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
            <div>
            <p className="text-sm font-medium text-gray-700">Habilitar acesso ao portal</p>
            <p className="text-xs text-gray-400 mt-0.5">
                O cliente receberá um e-mail com o link de acesso
            </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                checked={form.portalEnabled}
                onChange={(e) => set("portalEnabled", e.target.checked)}
                className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
        </div>

        {form.portalEnabled && (
            <div>
            <label htmlFor="free-portal-email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail de acesso ao portal <span className="text-red-500">*</span>
            </label>
            <input
                id="free-portal-email"
                type="email"
                value={form.portalEmail}
                onChange={(e) => set("portalEmail", e.target.value)}
                required={form.portalEnabled}
                placeholder="cliente@email.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">
                O cliente usará este e-mail para acessar o portal
            </p>
            </div>
        )}
        </div>

          {/* Erro */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}