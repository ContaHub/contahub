"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { getPortalObligations, PortalObligation, OBLIGATION_LABELS, STATUS_CONFIG, MONTHS } from "@/lib/portal";

export default function ClientObligationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();
  const [obligations, setObligations] = useState<PortalObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [obligationForUpload, setObligationForUpload] = useState<PortalObligation | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  useEffect(() => {
    async function load() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const token = await getToken();
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        const res = await fetch(
          `${API_URL}/api/v1/portal/${slug}/client-by-email?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const { data } = await res.json();

        setClientId(data.id);
        const obs = await getPortalObligations(slug, data.id, token);
        setObligations(obs.data);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user, slug]);

  async function handleComprovanteUpload() {
  if (!uploadFile || !obligationForUpload || !clientId) return;
  setUploading(true);
  setUploadError("");
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("clientId", clientId);
    const res = await fetch(
      `${API_URL}/api/v1/portal/${slug}/obligations/${obligationForUpload.id}/comprovante`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Erro ao enviar comprovante");
    }
    setUploadSuccess("Comprovante enviado! O escritório irá confirmar o pagamento.");
    setObligationForUpload(null);
    setUploadFile(null);
    // Recarrega obrigações para atualizar status
    const token2 = await getToken();
    const obs = await getPortalObligations(slug, clientId, token2!);
    setObligations(obs.data);
    setTimeout(() => setUploadSuccess(""), 5000);
  } catch (err: any) {
    setUploadError(err.message || "Erro ao enviar comprovante");
  } finally {
    setUploading(false);
  }
}

  return (
    <div>
      {/* Banner de sucesso */}
        {uploadSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>✅ {uploadSuccess}</span>
            <button onClick={() => setUploadSuccess("")} className="text-green-400 hover:text-green-600 ml-4">✕</button>
          </div>
        )}

        {/* Modal de upload de comprovante */}
        {obligationForUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Enviar comprovante</h3>
              <p className="text-sm text-gray-500 mb-4">
                {OBLIGATION_LABELS[obligationForUpload.type] || obligationForUpload.type} — {MONTHS[obligationForUpload.competenceMonth - 1]}/{obligationForUpload.competenceYear}
              </p>

              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
                  uploadFile ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {uploadFile ? (
                  <div>
                    <p className="text-sm font-medium text-blue-700">{uploadFile.name}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-1">📎</p>
                    <p className="text-sm font-medium text-gray-600">Clique para selecionar o comprovante</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG — máx. 10MB</p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
                  ❌ {uploadError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setObligationForUpload(null); setUploadFile(null); setUploadError(""); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleComprovanteUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {uploading ? "Enviando..." : "Enviar comprovante"}
                </button>
              </div>
            </div>
          </div>
        )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Obrigações Fiscais</h1>
        <p className="mt-1 text-sm text-gray-500">
          Histórico de obrigações fiscais da sua empresa
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : obligations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">Nenhuma obrigação encontrada</p>
                <p className="text-sm text-gray-400 mt-1">Suas obrigações fiscais aparecerão aqui quando forem lançadas pelo escritório.</p>
              </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 pl-6">Obrigação</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Competência</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {obligations.map((ob) => {
                  const status = STATUS_CONFIG[ob.status];
                  return (
                      <tr key={ob.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 pl-6">
                          <p className="text-sm font-medium text-gray-900">{OBLIGATION_LABELS[ob.type] || ob.type}</p>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-600">
                            {MONTHS[ob.competenceMonth - 1]}/{ob.competenceYear}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-600">
                            {new Date(ob.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                          {/* Alerta se vencida e não concluída */}
                          {ob.status !== "COMPLETED" && ob.status !== "CANCELED" && new Date(ob.dueDate) < new Date() && (
                            <p className="text-xs text-red-500 mt-0.5">⚠️ Vencida</p>
                          )}
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-600">
                            {ob.amount != null
                              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ob.amount / 100)
                              : "—"}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.class}`}>
                            {status?.label}
                          </span>
                          {ob.status === "COMPLETED" && ob.completedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(ob.completedAt).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </td>
                        <td className="py-4 pr-6">
                          {(ob.status === "PENDING" || ob.status === "OVERDUE") && (
                            <button
                              onClick={() => { setObligationForUpload(ob); setUploadFile(null); setUploadError(""); }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              📤 Enviar comprovante
                            </button>
                          )}
                          {ob.status === "IN_PROGRESS" && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                              ⏳ Aguardando confirmação
                            </span>
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
    </div>
  );
}
