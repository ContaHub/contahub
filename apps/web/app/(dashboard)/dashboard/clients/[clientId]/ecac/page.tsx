"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEcacResultado,
  getEcacHistorico,
  triggerEcacConsulta,
  PENDENCY_CONFIG,
  formatCurrency,
  EcacClientResult,
  EcacConsultation,
} from "@/lib/ecac";

export default function EcacClientePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

  const [resultado, setResultado] = useState<EcacClientResult | null>(null);
  const [historico, setHistorico]  = useState<EcacConsultation[]>([]);
  const [loading, setLoading]      = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");
  const [activeTab, setActiveTab]  = useState<"pendencias" | "historico">("pendencias");

  const load = async () => {
    setLoading(true);
    try {
      const [res, hist] = await Promise.all([
        getEcacResultado(clientId),
        getEcacHistorico(clientId),
      ]);
      setResultado(res);
      setHistorico(hist);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg("");
    try {
      const res = await triggerEcacConsulta(clientId);
      setTriggerMsg(`✓ Consulta enfileirada (${res.jobId}) — aguarde alguns minutos`);
    } catch (err: any) {
      setTriggerMsg(`✗ ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pendencias = resultado?.consulta?.pendencies ?? [];
  const alertCount = resultado?.client.ecacAlertCount ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/clients")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            🏛 e-CAC — {resultado?.client.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {resultado?.client.ecacLastChecked
              ? `Última consulta: ${new Date(resultado.client.ecacLastChecked).toLocaleString("pt-BR")}`
              : "Nenhuma consulta realizada ainda"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {alertCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              ⚠️ {alertCount} pendência{alertCount > 1 ? "s" : ""}
            </span>
          )}
          {alertCount === 0 && resultado?.client.ecacLastChecked && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              ✓ Sem pendências
            </span>
          )}
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {triggering ? "Enfileirando..." : "🔄 Consultar agora"}
          </button>
        </div>
      </div>

      {/* Mensagem de trigger */}
      {triggerMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          triggerMsg.startsWith("✓")
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {triggerMsg}
        </div>
      )}

      {/* Status da última consulta */}
      {resultado?.consulta && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          resultado.consulta.status === "SUCCESS"
            ? "border-green-200 bg-green-50"
            : resultado.consulta.status === "PARTIAL"
            ? "border-yellow-200 bg-yellow-50"
            : "border-red-200 bg-red-50"
        }`}>
          <span className="text-2xl">
            {resultado.consulta.status === "SUCCESS" ? "✅" :
             resultado.consulta.status === "PARTIAL" ? "⚠️" : "❌"}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {resultado.consulta.status === "SUCCESS" ? "Consulta realizada com sucesso" :
               resultado.consulta.status === "PARTIAL" ? "Consulta parcial" :
               "Falha na consulta"}
            </p>
            {resultado.consulta.errorMessage && (
              <p className="text-xs text-red-600 mt-0.5">{resultado.consulta.errorMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(["pendencias", "historico"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "pendencias"
                ? `Pendências ${pendencias.length > 0 ? `(${pendencias.length})` : ""}`
                : `Histórico (${historico.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Pendências */}
      {activeTab === "pendencias" && (
        <div className="space-y-3">
          {pendencias.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">Nenhuma pendência encontrada</p>
              <p className="text-sm text-gray-400 mt-1">
                {resultado?.client.ecacLastChecked
                  ? "O cliente está em dia com a Receita Federal"
                  : "Execute uma consulta para verificar"}
              </p>
            </div>
          ) : (
            pendencias.map((p) => {
              const cfg = PENDENCY_CONFIG[p.type] || PENDENCY_CONFIG.OTHER;
              return (
                <div key={p.id} className="rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {p.situation && (
                        <span className="text-xs text-gray-500">{p.situation}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{p.description}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      {p.amount && (
                        <span className="font-medium text-red-600">{formatCurrency(p.amount)}</span>
                      )}
                      {p.dueDate && (
                        <span>Venc.: {new Date(p.dueDate).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === "historico" && (
        <div className="space-y-3">
          {historico.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">Nenhuma consulta realizada</p>
            </div>
          ) : (
            historico.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>
                      {c.status === "SUCCESS" ? "✅" : c.status === "PARTIAL" ? "⚠️" : "❌"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(c.consultedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {c.pendencies.length} pendência{c.pendencies.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {c.errorMessage && (
                  <p className="text-xs text-red-600 mt-2">{c.errorMessage}</p>
                )}
                {c.pendencies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.pendencies.slice(0, 3).map((p) => {
                      const cfg = PENDENCY_CONFIG[p.type] || PENDENCY_CONFIG.OTHER;
                      return (
                        <span key={p.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {p.description.slice(0, 30)}{p.description.length > 30 ? "..." : ""}
                        </span>
                      );
                    })}
                    {c.pendencies.length > 3 && (
                      <span className="text-xs text-gray-400">+{c.pendencies.length - 3} mais</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
