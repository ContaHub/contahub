"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { usePortalClient } from "@/components/portal/PortalClientProvider";
import Link from "next/link";
import {
  getPortalDocuments, getPortalObligations,
  PortalDocument, PortalObligation,
  OBLIGATION_LABELS, STATUS_CONFIG, MONTHS,
} from "@/lib/portal";

export default function ClientDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();
  const { getToken } = useAuth();
  const { client, can } = usePortalClient();
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<PortalDocument[]>([]);
  const [allObligations, setAllObligations] = useState<PortalObligation[]>([]);
  const [obligations, setPortalObligations] = useState<PortalObligation[]>([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    if (!client) return;

    async function loadData() {
      try {
        const token = await getToken();
        if (!token) return;

        const [docs, obs] = await Promise.all([
          can("VIEW_DOCUMENTS")
            ? getPortalDocuments(slug, client!.id, token).catch(() => null)
            : null,
          can("VIEW_OBLIGATIONS")
            ? getPortalObligations(slug, client!.id, token).catch(() => null)
            : null,
        ]);

        if (docs) {
          setAllDocuments(docs.data);
          setDocuments(docs.data.slice(0, 3));
        }
        if (obs) {
          setAllObligations(obs.data);                 // lista completa, usada nos contadores
          setPortalObligations(obs.data.slice(0, 3));  // só 3, usada na listagem
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [client?.id, slug]);

  const pendingObligations = allObligations.filter(
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

      {/* Acesso limitado — cliente sem permissão de ver documentos nem obrigações */}
      {!can("VIEW_DOCUMENTS") && !can("VIEW_OBLIGATIONS") && (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-12 px-6 mb-8">
          <p className="text-gray-700 font-medium">Seu acesso está limitado</p>
          <p className="text-sm text-gray-400 mt-1">
            Fale com o seu escritório contábil para liberar mais recursos no portal.
          </p>
        </div>
      )}

      {/* Banner proativo — documentos aguardando aprovação */}
      {!loading && can("REVIEW_REPORTS") && docsUnderReview.length > 0 && (
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
        {can("VIEW_DOCUMENTS") && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Documentos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{documents.length}</p>
            <p className="text-xs text-gray-400 mt-1">disponíveis para você</p>
          </div>
        )}

        {can("VIEW_OBLIGATIONS") && (
          <>
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
                {allObligations.filter((o) => o.status === "COMPLETED").length}
              </p>
              <p className="text-xs text-gray-400 mt-1">concluídas no período</p>
            </div>
          </>
        )}
      </div>

      {/* Documentos recentes */}
      {can("VIEW_DOCUMENTS") && (
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
      )}

      {/* Obrigações recentes */}
      {can("VIEW_OBLIGATIONS") && (
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
      )}
    </div>
  );
}