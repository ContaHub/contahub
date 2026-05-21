"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { getPortalDocuments, getPortalDownloadUrl, PortalDocument, formatFileSize } from "@/lib/portal";

export default function ClientDocumentsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();

  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    async function load() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        const res = await fetch(`${API_URL}/api/v1/portal/${slug}/client-by-email?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const { data } = await res.json();
        setClientId(data.id);

        const docs = await getPortalDocuments(slug, data.id);
        setDocuments(docs.data);
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
      const url = await getPortalDownloadUrl(doc.id, token || "");
      window.open(url, "_blank");
    } catch {
      alert("Erro ao baixar documento");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meus Documentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? "Carregando..." : `${documents.length} ${documents.length !== 1 ? "documentos" : "documento"} disponível`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📁</p>
            <p className="text-gray-500">Nenhum documento disponível</p>
            <p className="text-gray-400 text-sm mt-1">Os documentos serão disponibilizados pelo seu escritório</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{doc.mimeType?.includes("pdf") ? "📕" : doc.mimeType?.startsWith("image") ? "🖼️" : "📄"}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-400">
                      {doc.description && `${doc.description} · `}
                      {doc.sizeBytes && formatFileSize(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {downloading === doc.id ? (
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Baixar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
