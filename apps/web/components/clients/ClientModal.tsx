"use client";

import { useState, useId } from "react";
import { createClient, updateClient, Client, TAX_REGIME_LABELS } from "@/lib/clients";
import { ptBRValidity, clearValidity } from "@/lib/formValidation";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import {
  PORTAL_PERMISSIONS,
  PORTAL_PERMISSION_LABELS,
  PORTAL_PRESETS,
  normalizeWhatsappNumber,
} from "@contahub/shared";
import type { PortalPermission, PortalPresetKey } from "@contahub/shared";

interface ClientModalProps {
  client?: Client;
  onClose: () => void;
  onSuccess: () => void;
}

type PersonType = "PJ" | "PF";

const PJ_REGIMES = ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL", "MEI", "ISENTO"];
const PF_REGIMES = ["ISENTO"];

function maskCnpj(value: string): string {
  // Extrai só alfanuméricos do valor (mesmo que já venha formatado)
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 14);
  
  if (raw.length === 0) return "";
  if (raw.length <= 2)  return raw;
  if (raw.length <= 5)  return `${raw.slice(0,2)}.${raw.slice(2)}`;
  if (raw.length <= 8)  return `${raw.slice(0,2)}.${raw.slice(2,5)}.${raw.slice(5)}`;
  if (raw.length <= 12) return `${raw.slice(0,2)}.${raw.slice(2,5)}.${raw.slice(5,8)}/${raw.slice(8)}`;
  return `${raw.slice(0,2)}.${raw.slice(2,5)}.${raw.slice(5,8)}/${raw.slice(8,12)}-${raw.slice(12)}`;
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

const DEFAULT_PERMISSIONS: PortalPermission[] = [...PORTAL_PRESETS.STANDARD.permissions];

// Descobre qual preset bate com a lista atual; se nenhum, é "CUSTOM".
function detectPreset(perms: readonly string[]): PortalPresetKey | "CUSTOM" {
  const set = new Set(perms);
  for (const key of Object.keys(PORTAL_PRESETS) as PortalPresetKey[]) {
    const preset = PORTAL_PRESETS[key].permissions;
    if (preset.length === set.size && preset.every((p) => set.has(p))) return key;
  }
  return "CUSTOM";
}

export function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFound, setCnpjFound] = useState(false);
  const titleId = useId();
  const dialogRef = useDialogA11y(onClose);

  const initialType: PersonType =
    client?.cnpj?.startsWith("PF-") ? "PF" : "PJ";

  const [personType, setPersonType] = useState<PersonType>(initialType);

  const [form, setForm] = useState({
    name: client?.name || "",
    tradeName: client?.tradeName || "",
    cnpj: client?.cnpj || "",
    cpf: client?.cpf || "",
    taxRegime: client?.taxRegime || "SIMPLES_NACIONAL",
    email: client?.email || "",
    phone: client?.phone || "",
    whatsapp: client?.whatsapp || "",
    zipCode: "",
    street: "",
    city: "",
    state: "",
    notes: client?.notes || "",
    // ── Portal do cliente ──
    portalEnabled: client?.portalEnabled ?? false,
    portalEmail: client?.portalEmail || "",
    portalPermissions: (client?.portalPermissions ?? DEFAULT_PERMISSIONS) as PortalPermission[],
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({
        ...prev,
        [name]: checked,
        // Ao ligar o portal, sugere o e-mail de contato como e-mail de login
        ...(name === "portalEnabled" && checked && !prev.portalEmail && prev.email
          ? { portalEmail: prev.email }
          : {}),
      }));
      return;
    }

    if (name === "cnpj") {
      setForm((prev) => ({ ...prev, cnpj: maskCnpj(value) }));
      setCnpjFound(false);
      const raw = value.replace(/[^a-zA-Z0-9]/g, "");
      if (raw.length === 14) fetchCnpjData(raw);
      return;
    }

    if (name === "cpf") {
      setForm((prev) => ({ ...prev, cpf: maskCpf(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

async function fetchCnpjData(cnpj: string) {
  setCnpjLoading(true);
  setCnpjFound(false);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cnpj/${cnpj}/lookup`);
    if (!res.ok) throw new Error("CNPJ não encontrado");
    const json = await res.json();
    const data = json.data;

    let taxRegime = "SIMPLES_NACIONAL";
    if (data.simei?.optante === true) {
      taxRegime = "MEI";
    } else if (data.simples?.optante === false) {
      taxRegime = "LUCRO_PRESUMIDO";
    }

    setForm((prev) => ({
      ...prev,
      name:      data.nome      || prev.name,
      tradeName: data.fantasia  || prev.tradeName,
      taxRegime,
      zipCode:   data.cep       || prev.zipCode,
      street:    [data.logradouro, data.numero, data.complemento].filter(Boolean).join(", ") || prev.street,
      city:      data.municipio || prev.city,
      state:     data.uf        || prev.state,
    }));

    setCnpjFound(true);
  } catch {
    setCnpjFound(false);
  } finally {
    setCnpjLoading(false);
  }
}

  function handlePersonTypeChange(type: PersonType) {
    setPersonType(type);
    setForm({
      name: "", tradeName: "", cnpj: "", cpf: "",
      taxRegime: type === "PF" ? "ISENTO" : "SIMPLES_NACIONAL",
      email: "", phone: "", whatsapp: "",
      zipCode: "", street: "", city: "", state: "", notes: client?.notes || "",
      portalEnabled: false, portalEmail: "",portalPermissions: DEFAULT_PERMISSIONS,
    });
    setCnpjFound(false);
  }

  function applyPreset(key: PortalPresetKey) {
  setForm((prev) => ({ ...prev, portalPermissions: [...PORTAL_PRESETS[key].permissions] }));
}

function togglePermission(p: PortalPermission) {
  setForm((prev) => ({
    ...prev,
    portalPermissions: prev.portalPermissions.includes(p)
      ? prev.portalPermissions.filter((x) => x !== p)
      : [...prev.portalPermissions, p],
  }));
}

const currentPreset = detectPreset(form.portalPermissions);

// Mesma regra do backend (PortalNoticesService): WhatsApp, com fallback para telefone
const hasValidWhatsapp = !!(
  normalizeWhatsappNumber(form.whatsapp) ?? normalizeWhatsappNumber(form.phone)
);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validação: se portal habilitado, e-mail é obrigatório
    if (form.portalEnabled && !form.portalEmail) {
      setError(
        "Informe o e-mail de login do cliente no portal. É com ele que o cliente entra, mesmo que o link seja enviado pelo WhatsApp."
      );
      setLoading(false);
      document.getElementById("portalEmail")?.focus();
      return;
    }

    if (form.portalEnabled && form.portalPermissions.length === 0) {
      setError("Selecione ao menos uma permissão para o cliente no portal.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: form.name,
        tradeName: form.tradeName || undefined,
        cnpj: personType === "PJ" ? form.cnpj : `PF-${form.cpf.replace(/\D/g, "")}`,
        cpf: form.cpf || undefined,
        taxRegime: form.taxRegime,
        email: form.email || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        notes: form.notes || undefined,
        // ── Portal ──
        portalEnabled: form.portalEnabled,
        portalEmail: form.portalEnabled ? form.portalEmail : undefined,
        portalPermissions: form.portalEnabled ? form.portalPermissions : undefined,
      };

      if (client) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  }

  const regimesDisponiveis = personType === "PJ" ? PJ_REGIMES : PF_REGIMES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">              
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Toggle PJ / PF */}
          {!client && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cliente</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button type="button" onClick={() => handlePersonTypeChange("PJ")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${personType === "PJ" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  Pessoa Jurídica (PJ)
                </button>
                <button type="button" onClick={() => handlePersonTypeChange("PF")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${personType === "PF" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  Pessoa Física (PF)
                </button>
              </div>
            </div>
          )}

          {/* CNPJ */}
          {personType === "PJ" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
              <div className="relative">
                <input name="cnpj" value={form.cnpj} onChange={handleChange} required
                  placeholder="Ex: 12.ABC.345/0001-99 ou 00.000.000/0001-00"
                  onInvalid={ptBRValidity}
                  onInput={clearValidity}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cnpjLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  {cnpjFound && !cnpjLoading && (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {cnpjFound && <p className="text-xs text-green-600 mt-1">✓ Dados preenchidos automaticamente pela Receita Federal</p>}
              <p className="text-xs text-gray-400 mt-1">Digite o CNPJ para preencher os dados automaticamente</p>
            </div>
          )}

          {/* CPF */}
          {(personType === "PF" || form.taxRegime === "MEI") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF {personType === "PF" ? "*" : "(titular MEI)"}
              </label>
              <input name="cpf" value={form.cpf} onChange={handleChange} required={personType === "PF"}
                placeholder="000.000.000-00"
                onInvalid={ptBRValidity}
                onInput={clearValidity}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {personType === "PJ" ? "Razão Social *" : "Nome Completo *"}
            </label>
            <input name="name" value={form.name} onChange={handleChange} required
              placeholder={personType === "PJ" ? "Ex: Padaria São João Ltda" : "Ex: Maria Silva"}
              onInvalid={ptBRValidity}
              onInput={clearValidity}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Nome Fantasia */}
          {personType === "PJ" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
              <input name="tradeName" value={form.tradeName} onChange={handleChange}
                placeholder="Ex: Padaria São João"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Regime Tributário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regime Tributário *</label>
            <select name="taxRegime" value={form.taxRegime} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {regimesDisponiveis.map((regime) => (
                <option key={regime} value={regime}>{TAX_REGIME_LABELS[regime]}</option>
              ))}
            </select>
          </div>

          {/* Contato */}
          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contato</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="email@empresa.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="11999990000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="11999990000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          {(form.city || form.street) && (
            <div className="border-t border-gray-100 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Endereço</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                {form.street && <p>{form.street}</p>}
                {form.city && <p>{form.city}{form.state ? ` — ${form.state}` : ""}</p>}
                {form.zipCode && <p>CEP: {form.zipCode}</p>}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="Informações adicionais sobre o cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* ── Acesso ao Portal ─────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Portal do Cliente
            </p>

            {/* Toggle portalEnabled */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Habilitar acesso ao portal</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  O link de acesso é enviado para o WhatsApp cadastrado do cliente
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="portalEnabled"
                  checked={form.portalEnabled}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            {form.portalEnabled && (
              <>
                {/* E-mail de login */}
                <div>
                  <label htmlFor="portalEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail de login no portal *
                  </label>
                  <input
                    id="portalEmail"
                    name="portalEmail"
                    type="email"
                    value={form.portalEmail}
                    onChange={handleChange}
                    required={form.portalEnabled}
                    placeholder="cliente@email.com"
                    onInvalid={ptBRValidity}
                    onInput={clearValidity}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    É o e-mail com que o cliente faz login. O link de acesso vai pelo WhatsApp.
                  </p>
                </div>

                {!hasValidWhatsapp && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2.5 rounded-lg"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-px"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                      />
                    </svg>
                    <span>
                      Este cliente não tem um WhatsApp válido cadastrado. Ele consegue acessar o portal, mas
                      não receberá os avisos por WhatsApp (link de acesso, novos documentos e obrigações).
                      Informe o número com DDD no campo WhatsApp ou Telefone, acima.
                    </span>
                  </div>
                )}

                {/* Permissões */}
                <fieldset className="mt-4">
                  <legend className="block text-sm font-medium text-gray-700 mb-2">
                    Permissões do cliente no portal
                  </legend>

                  <div className="grid grid-cols-3 gap-2 mb-2" role="group" aria-label="Perfis de acesso">
                    {(Object.keys(PORTAL_PRESETS) as PortalPresetKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        aria-pressed={currentPreset === key}
                        className={`px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          currentPreset === key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {PORTAL_PRESETS[key].label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    {currentPreset === "CUSTOM"
                      ? "Personalizado — ajuste as permissões abaixo."
                      : PORTAL_PRESETS[currentPreset].description}
                  </p>

                  <div className="space-y-2">
                    {PORTAL_PERMISSIONS.map((p) => (
                      <label
                        key={p}
                        htmlFor={`perm-${p}`}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          id={`perm-${p}`}
                          type="checkbox"
                          checked={form.portalPermissions.includes(p)}
                          onChange={() => togglePermission(p)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {PORTAL_PERMISSION_LABELS[p]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || cnpjLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">
              {loading ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

