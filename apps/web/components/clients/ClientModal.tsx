"use client";

import { useState } from "react";
import { createClient, updateClient, Client, TAX_REGIME_LABELS } from "@/lib/clients";

interface ClientModalProps {
  client?: Client;
  onClose: () => void;
  onSuccess: () => void;
}

// Tipo de pessoa — define quais campos aparecem no formulário
type PersonType = "PJ" | "PF";

// Regimes disponíveis por tipo de pessoa
const PJ_REGIMES = ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL", "MEI", "ISENTO"];
const PF_REGIMES = ["ISENTO"]; // PF geralmente é isento de CNPJ

// Formata CNPJ enquanto o usuário digita: 00.000.000/0000-00
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

// Formata CPF enquanto o usuário digita: 000.000.000-00
function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFound, setCnpjFound] = useState(false);

  // Detecta se é PF pelo schema: tem CPF mas não CNPJ válido de 14 dígitos
  const initialType: PersonType =
    client?.cpf && !client?.cnpj ? "PF" : "PJ";

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
    notes: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    // Aplica máscara nos campos de documento
    if (name === "cnpj") {
      setForm((prev) => ({ ...prev, cnpj: maskCnpj(value) }));
      // Limpa o status de "encontrado" se o usuário editar
      setCnpjFound(false);
      // Dispara busca quando tiver 14 dígitos
      const digits = value.replace(/\D/g, "");
      if (digits.length === 14) fetchCnpjData(digits);
      return;
    }

    if (name === "cpf") {
      setForm((prev) => ({ ...prev, cpf: maskCpf(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Consulta a BrasilAPI com o CNPJ e preenche os campos automaticamente
  async function fetchCnpjData(cnpj: string) {
    setCnpjLoading(true);
    setCnpjFound(false);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");

      const data = await res.json();

      // Mapeia o porte da empresa para o regime tributário mais provável
      // Isso é uma sugestão — o contador pode corrigir
      let taxRegime = "SIMPLES_NACIONAL";
      if (data.porte === "MICRO EMPRESA" || data.porte === "EMPRESA DE PEQUENO PORTE") {
        taxRegime = "SIMPLES_NACIONAL";
      } else if (data.porte === "DEMAIS") {
        taxRegime = "LUCRO_PRESUMIDO";
      }

      setForm((prev) => ({
        ...prev,
        name: data.razao_social || prev.name,
        tradeName: data.nome_fantasia || prev.tradeName,
        taxRegime,
        zipCode: data.cep?.replace(/\D/g, "") || prev.zipCode,
        street: [data.logradouro, data.numero, data.complemento]
          .filter(Boolean)
          .join(", ") || prev.street,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
      }));

      setCnpjFound(true);
    } catch {
      // CNPJ inválido ou não encontrado — não bloqueia o formulário
      setCnpjFound(false);
    } finally {
      setCnpjLoading(false);
    }
  }

function handlePersonTypeChange(type: PersonType) {
  setPersonType(type);
  setForm({
    name: "",
    tradeName: "",
    cnpj: "",
    cpf: "",
    taxRegime: type === "PF" ? "ISENTO" : "SIMPLES_NACIONAL",
    email: "",
    phone: "",
    whatsapp: "",
    zipCode: "",
    street: "",
    city: "",
    state: "",
    notes: "",
  });
  setCnpjFound(false);
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Para PF, usa o CPF como identificador principal
      // O schema aceita CNPJ vazio para PF (apenas CPF)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Toggle PJ / PF */}
          {!client && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de cliente
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handlePersonTypeChange("PJ")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    personType === "PJ"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Pessoa Jurídica (PJ)
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonTypeChange("PF")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                    personType === "PF"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Pessoa Física (PF)
                </button>
              </div>
            </div>
          )}

          {/* CNPJ com busca automática — só para PJ */}
          {personType === "PJ" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ *
              </label>
              <div className="relative">
                <input
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  required
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {/* Indicadores de status da busca */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cnpjLoading && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {cnpjFound && !cnpjLoading && (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {cnpjFound && (
                <p className="text-xs text-green-600 mt-1">✓ Dados preenchidos automaticamente pela Receita Federal</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Digite o CNPJ para preencher os dados automaticamente</p>
            </div>
          )}

          {/* CPF — para PF, ou opcional para MEI */}
          {(personType === "PF" || form.taxRegime === "MEI") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF {personType === "PF" ? "*" : "(titular MEI)"}
              </label>
              <input
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                required={personType === "PF"}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Nome / Razão Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {personType === "PJ" ? "Razão Social *" : "Nome Completo *"}
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder={personType === "PJ" ? "Ex: Padaria São João Ltda" : "Ex: Maria Silva"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Nome Fantasia — só para PJ */}
          {personType === "PJ" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Fantasia
              </label>
              <input
                name="tradeName"
                value={form.tradeName}
                onChange={handleChange}
                placeholder="Ex: Padaria São João"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Regime Tributário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regime Tributário *
            </label>
            <select
              name="taxRegime"
              value={form.taxRegime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {regimesDisponiveis.map((regime) => (
                <option key={regime} value={regime}>
                  {TAX_REGIME_LABELS[regime]}
                </option>
              ))}
            </select>
          </div>

          {/* Divisor */}
          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Contato
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="11999990000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="11999990000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço — preenchido automaticamente pelo CNPJ */}
          {(form.city || form.street) && (
            <div className="border-t border-gray-100 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Endereço
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                {form.street && <p>{form.street}</p>}
                {form.city && <p>{form.city}{form.state ? ` — ${form.state}` : ""}</p>}
                {form.zipCode && <p>CEP: {form.zipCode}</p>}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Informações adicionais sobre o cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cnpjLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
