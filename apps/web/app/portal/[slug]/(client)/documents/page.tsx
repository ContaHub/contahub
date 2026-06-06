"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  getPortalDocuments, getPortalClientDownloadUrl,
  PortalDocument, formatFileSize,
} from "@/lib/portal";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  UPLOADED: { label: "Disponível", class: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Aprovado", class: "bg-green-100 text-green-700" },
  UNDER_REVIEW: { label: "Em revisão", class: "bg-yellow-100 text-yellow-700" },
  Rejeitado: { label: "Revisão solicitada", class: "bg-red-100 text-red-700" },
};

export default function ClientDocumentsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();

  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<PortalDocument | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [clientId, setClientId] = useState("");

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  async function loadDocuments(cId: string, token: string) {
    const docs = await getPortalDocuments(slug, cId, token);
    setDocuments(docs.data);
  }

  useEffect(() => {
    async function load() {
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
        await loadDocuments(data.id, token);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user, slug]);

  async function handleDownload(doc: PortalDocument) {
    setDownloading(doc.id);
    try {
      const token = await getToken();
      if (!token) return;

      const url = await getPortalClientDownloadUrl(slug, doc.id, token);
      window.open(url, "_blank");
    } catch {
      setDeleteError("Erro ao baixar documento. Tente novamente.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(doc: PortalDocument) {
    const isByClient = doc.description?.startsWith("[Cliente]") || doc.description === "[Enviado pelo cliente]";
    if (!isByClient) {
      setDeleteError("Você não pode remover documentos enviados pelo escritório.");
      return;
    }
    setDocToDelete(doc);
  }

  async function confirmDelete() {
    if (!docToDelete) return;
    setDeleting(docToDelete.id);
    setDeleteError("");
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/portal/${slug}/documents/${docToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao remover documento");
      setDocToDelete(null);
      await loadDocuments(clientId, token);
    } catch {
      setDeleteError("Erro ao remover documento. Tente novamente.");
      setDocToDelete(null);
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const token = await getToken();
      if (!token) return;

      const formData = new FormData();
      formData.append("file", file);
      if (description) formData.append("description", description);

      const res = await fetch(`${API_URL}/api/v1/portal/${slug}/documents/${clientId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro no upload");
      }

      setUploadSuccess("Documento enviado com sucesso! O escritório será notificado.");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments(clientId, token);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  }

  // Modal de confirmação de exclusão
  const ConfirmDeleteModal = docToDelete ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Remover documento</h3>
        <p className="text-sm text-gray-500 mb-6">
          Tem certeza que deseja remover <span className="font-medium text-gray-700">&quot;{docToDelete.name}&quot;</span>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDocToDelete(null)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            disabled={!!deleting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {deleting ? "Removendo..." : "Remover"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {ConfirmDeleteModal}

      {deleteError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <span>❌ {deleteError}</span>
          <button onClick={() => setDeleteError("")} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Documentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Documentos compartilhados pelo seu escritório e arquivos enviados por você.
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Enviar documento ao escritório</h2>
        <p className="text-sm text-gray-500 mb-4">
          Envie extratos, notas fiscais ou qualquer documento para o seu contador.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (ex: Extrato bancário maio/2026)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.xml"
              onChange={handleUpload}
              disabled={uploadLoading}
            />
            {uploadLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600">Enviando...</span>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-1">📎</p>
                <p className="text-sm font-medium text-gray-600">Clique para selecionar arquivo</p>
                <p className="text-xs text-gray-400 mt-1">PDF, imagens, Excel, XML — máx. 10MB</p>
              </div>
            )}
          </div>
          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              ✅ {uploadSuccess}
            </div>
          )}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              ❌ {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Documentos disponíveis</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📁</p>
            <p className="text-gray-500 text-sm">Nenhum documento disponível ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {documents.map((doc) => {
              const status = STATUS_LABELS[doc.status] || STATUS_LABELS.UPLOADED;
              const isByClient = doc.description?.startsWith("[Cliente]") || doc.description === "[Enviado pelo cliente]";
              return (
                <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 group transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {doc.mimeType?.includes("pdf") ? "📕" : doc.mimeType?.startsWith("image") ? "🏙️" : "📄"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        {isByClient && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            Enviado por você
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {doc.sizeBytes && `${formatFileSize(doc.sizeBytes)} · `}
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.class}`}>
                      {status.label}
                    </span>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {downloading === doc.id ? "..." : "Visualizar"}
                    </button>
                    {/* Botão remover — só aparece para docs enviados pelo cliente */}
                    {isByClient && (
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                      >
                        {deleting === doc.id ? "..." : "🗑"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
