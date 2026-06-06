"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { getPortalClientDownloadUrl, formatFileSize } from "@/lib/portal";

interface Report {
  id: string;
  name: string;
  description?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export default function ClientReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({});
  const [showRevisionInput, setShowRevisionInput] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  async function loadReports(cId: string, token: string) {
    const res = await fetch(`${API_URL}/api/v1/portal/${slug}/reports/${cId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const { data } = await res.json();
      setReports(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(
          `${API_URL}/api/v1/portal/${slug}/client-by-email?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const { data } = await res.json();
        setClientId(data.id);
        await loadReports(data.id, token);
      } catch {
        setLoading(false);
      }
    }
    if (user) init();
  }, [user, slug]);

  async function handleDownload(report: Report) {
    setDownloading(report.id);
    try {
      const token = await getToken();
      if (!token) return;

      const url = await getPortalClientDownloadUrl(slug, report.id, token);
      window.open(url, "_blank");
    } catch {
      alert("Erro ao baixar documento");
    } finally {
      setDownloading(null);
    }
  }

  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleApprove(reportId: string) {
    setProcessing(reportId);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/portal/${slug}/reports/${reportId}/approve`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        setSuccessMsg("✅ Documento aprovado com sucesso!");
        await loadReports(clientId, token);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } finally {
      setProcessing(null);
    }
  }

  async function handleRequestRevision(reportId: string) {
    const notes = revisionNotes[reportId];
    if (!notes?.trim()) {
      alert("Por favor, informe o motivo da revisão.");
      return;
    }
    setProcessing(reportId);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/portal/${slug}/reports/${reportId}/request-revision`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clientId, notes }),
      });
      if (res.ok) {
        setSuccessMsg("📝 Revisão solicitada. O escritório será notificado.");
        setShowRevisionInput(null);
        await loadReports(clientId, token);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos para Aprovação</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revise e aprove os documentos enviados pelo seu escritório contábil.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">Nenhum documento pendente de aprovação</p>
          <p className="text-gray-400 text-sm mt-1">Quando o escritório enviar documentos, eles aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {report.mimeType?.includes("pdf") ? "📕" : "📄"}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{report.name}</p>
                    {report.description && (
                      <p className="text-sm text-gray-500">{report.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {report.sizeBytes && `${formatFileSize(report.sizeBytes)} · `}
                      Enviado em {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(report)}
                  className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Visualizar
                </button>
              </div>

              {/* Área de revisão */}
              {showRevisionInput === report.id && (
                <div className="mb-4">
                  <textarea
                    value={revisionNotes[report.id] || ""}
                    onChange={(e) => setRevisionNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                    placeholder="Descreva o que precisa ser revisado..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(report.id)}
                  disabled={processing === report.id}
                  className="flex-1 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {processing === report.id ? "Processando..." : "✅ Aprovar documento"}
                </button>

                {showRevisionInput === report.id ? (
                  <button
                    onClick={() => handleRequestRevision(report.id)}
                    disabled={processing === report.id}
                    className="flex-1 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Revisar
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRevisionInput(report.id)}
                    className="flex-1 py-2 text-sm font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    📝 Revisar documento
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
