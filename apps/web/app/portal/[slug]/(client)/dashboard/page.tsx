"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  getPortalDocuments, getPortalObligations,
  PortalDocument, PortalObligation,
  OBLIGATION_LABELS, STATUS_CONFIG, MONTHS,
} from "@/lib/portal";

// ID do cliente — em produção viria de uma tabela ClientPortalUser
// Por enquanto, buscamos o primeiro cliente com portal habilitado
const DEMO_CLIENT_ID = ""; // será preenchido dinamicamente

export default function ClientDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();

  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<PortalDocument[]>([]);
  const [obligations, setPortalObligations] = useState<PortalObligation[]>([]);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca clientId via API usando o email do usuário logado
    async function loadData() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        // Busca o client pelo email do usuário logado no Clerk
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return;

        const token = await getToken();
        if (!token) return;

        const res = await fetch(
          `${API_URL}/api/v1/portal/${slug}/client-by-email?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const { data } = await res.json();

        setClientId(data.id);

        const [docs, obs] = await Promise.all([
          getPortalDocuments(slug, data.id, token),
          getPortalObligations(slug, data.id, token),
        ]);

        setAllDocuments(docs.data);
        setDocuments(docs.data.slice(0, 3)); // Mostra 3 mais recentes no widget
        setPortalObligations(obs.data.slice(0, 3));
      } catch {
        // silencia erros no demo
      } finally {
        setLoading(false);
      }
    }

    if (user) loadData();
  }, [user, slug]);

  const pendingObligations = obligations.filter(
    (o) => o.status === "PENDING" || o.status === "IN_PROGRESS"
  );

  const docsUnderReview = allDocuments.filter((d) => d.status === "UNDER_REVIEW");

  return (
    <div>
      {/* Saudação */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.firstName || "Cliente"}
        </h1>
        <p className="text-gray-500 mt-1">
          Aqui está um resumo das suas informações fiscais.
        </p>
      </div>

      {/* Banner proativo — documentos aguardando aprovação */}
      {!loading && docsUnderReview.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-6">
          <span>
            Você tem <strong>{docsUnderReview.length} {docsUnderReview.length === 1 ? "documento" : "documentos"}</strong> aguardando sua aprovação.
          </span>
          <Link
            href={`/portal/${slug}/reports`}
            className="ml-4 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
          >
            Ver documentos →
          </Link>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Documentos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{documents.length}</p>
          <p className="text-xs text-gray-400 mt-1">disponíveis para você</p>
        </div>
        <div className={`rounded-xl border p-5 ${pendingObligations.length > 0 ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
          <p className="text-sm text-gray-500">Obrigações Pendentes</p>
          <p className={`text-3xl font-bold mt-1 ${pendingObligations.length > 0 ? "text-orange-600" : "text-gray-900"}`}>
            {pendingObligations.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {pendingObligations.length > 0 ? "requer atenção" : "tudo em dia"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Obrigações Concluídas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {obligations.filter((o) => o.status === "COMPLETED").length}
          </p>
          <p className="text-xs text-gray-400 mt-1">concluídas no período</p>
        </div>
      </div>

      {/* Documentos recentes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Documentos Recentes</h2>
          <Link href={`/portal/${slug}/documents`} className="text-sm text-blue-600 hover:text-blue-700">
            Ver todos →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nenhum documento disponível</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.description && !doc.description.startsWith("[") ? doc.description : doc.name}
                    </p>
                    {doc.description && !doc.description.startsWith("[") && (
                      <p className="text-xs text-gray-400">{doc.name}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Obrigações recentes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Obrigações Fiscais</h2>
          <Link href={`/portal/${slug}/obligations`} className="text-sm text-blue-600 hover:text-blue-700">
            Ver todas →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : obligations.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nenhuma obrigação encontrada</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {obligations.map((ob) => {
              const status = STATUS_CONFIG[ob.status];
              return (
                <div key={ob.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {OBLIGATION_LABELS[ob.type] || ob.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {MONTHS[ob.competenceMonth - 1]}/{ob.competenceYear}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status?.class}`}>
                    {status?.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
