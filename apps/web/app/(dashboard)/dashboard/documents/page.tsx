"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDocuments, getDownloadUrl, deleteDocument,
  Document, formatFileSize, getFileIcon,
} from "@/lib/documents";
import { UploadModal } from "@/components/documents/UploadModal";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  UPLOADED: { label: "Enviado", class: "bg-blue-100 text-blue-700" },
  UNDER_REVIEW: { label: "Em revisão", class: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovado", class: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeitado", class: "bg-red-100 text-red-700" },
  PENDING_UPLOAD: { label: "Aguardando", class: "bg-gray-100 text-gray-600" },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getDocuments();
      setDocuments(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function handleDownload(doc: Document) {
    setDownloading(doc.id);
    try {
      const res = await getDownloadUrl(doc.id);
      // Abre a URL assinada em nova aba
      window.open(res.data.url, "_blank");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja remover este documento?")) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Carregando..." : `${documents.length} ${documents.length !== 1 ? "documentos" : "documento"}`}
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Enviar documento
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📁</p>
            <p className="text-gray-500 font-medium">Nenhum documento enviado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em &quot;Enviar documento&quot; para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4 pl-6">Documento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Tamanho</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pt-4">Data</th>
                  <th className="pb-3 pt-4 pr-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => {
                  const status = STATUS_LABELS[doc.status] || STATUS_LABELS.UPLOADED;
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getFileIcon(doc.mimeType)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            {doc.description && (
                              <p className="text-xs text-gray-400">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600">{doc.client.name}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-500">
                          {doc.sizeBytes ? formatFileSize(doc.sizeBytes) : "—"}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-500">
                          {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="py-4 pr-6">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={downloading === doc.id}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                          >
                            {downloading === doc.id ? "..." : "⬇ Baixar"}
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting === doc.id}
                            className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                          >
                            {deleting === doc.id ? "..." : "🗑 Remover"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={fetchDocuments}
        />
      )}
    </div>
  );
}
