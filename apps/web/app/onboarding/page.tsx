"use client";

/**
 * Tela de Onboarding — preenchida pelo contador no primeiro acesso.
 *
 * Detectada via middleware: workspace.name começa com "Escritório de "
 * (gerado automaticamente pelo WebhookService).
 *
 * Localização: apps/web/app/onboarding/page.tsx
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Building2, CheckCircle, Loader } from "lucide-react";

function maskCnpj(value: string): string {
  // Aceita alfanumérico — formato julho/2026
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 14);
  return raw
    .replace(/^(.{2})(.)/,       "$1.$2")
    .replace(/^(.{2}\..{3})(.)/,  "$1.$2")
    .replace(/^(.{2}\..{3}\..{3})(.)/, "$1/$2")
    .replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, "$1-$2");
}

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [name, setName]       = useState("");
  const [cnpj, setCnpj]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do escritório é obrigatório.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token   = await getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

      const res = await fetch(`${API_URL}/api/v1/workspace/onboarding`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          cnpj: cnpj ? cnpj.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao salvar. Tente novamente.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold text-slate-900">
            Bem-vindo ao ContaHub!
          </h1>
          <p className="text-[14px] text-slate-500 mt-1">
            Vamos configurar seu escritório em menos de 1 minuto.
          </p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

          {/* Indicador de etapa */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">1</span>
            </div>
            <span className="text-[13px] font-semibold text-slate-700">
              Dados do escritório
            </span>
            <div className="flex-1 h-px bg-slate-200 mx-2" />
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-400">2</span>
            </div>
            <span className="text-[13px] text-slate-400">Dashboard</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Nome do escritório */}
            <div>
              <label
                htmlFor="workspace-name"
                className="block text-[13px] font-medium text-slate-700 mb-1.5"
              >
                Nome do escritório <span className="text-red-500">*</span>
              </label>
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Silva & Associados Contabilidade"
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Este nome aparecerá no portal dos seus clientes.
              </p>
            </div>

            {/* CNPJ do escritório — opcional */}
            <div>
              <label
                htmlFor="workspace-cnpj"
                className="block text-[13px] font-medium text-slate-700 mb-1.5"
              >
                CNPJ do escritório{" "}
                <span className="text-[11px] text-slate-400 font-normal">
                  (opcional)
                </span>
              </label>
              <input
                id="workspace-cnpj"
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-lg transition-colors mt-2"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Acessar o Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        {/* Nota de segurança */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Você pode alterar essas informações depois em Configurações.
        </p>

      </div>
    </div>
  );
}