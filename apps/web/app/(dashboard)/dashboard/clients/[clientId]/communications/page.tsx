"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import {
  getClientCommunications,
  CHANNEL_LABELS,
  ClientCommunications,
} from "@/lib/communications";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientMessagesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const openMenu = useMobileMenu();

  const [result, setResult] = useState<ClientCommunications | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await getClientCommunications(clientId, page));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [clientId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = result?.client.tradeName || result?.client.name || "Cliente";
  const items = result?.communications ?? [];
  const meta = result?.meta;
  const subtitle = meta ? `${meta.total} mensagem(ns) no histórico` : "Carregando...";

  // Ações do cabeçalho: voltar + atualizar, no mesmo estilo dos botões da tela de clientes
  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push("/dashboard/clients")}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <ArrowLeft size={14} />
        Clientes
      </button>
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Atualizar
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader
        onMenuClick={openMenu}
        title={`Mensagens — ${clientName}`}
        subtitle={subtitle}
        action={actions}
      />

      <PageHeader title={`Mensagens — ${clientName}`} subtitle={subtitle} action={actions} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        {error && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <Card>
          {!loading && !error && items.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title="Nenhuma mensagem registrada"
              description="As mensagens trocadas com este cliente aparecerão aqui."
            />
          )}

          {loading && !result && (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Recebidas à esquerda, enviadas à direita */}
          {items.length > 0 && (
            <>
              {/* Cabeçalho da tabela: só em telas md+ */}
              <div className="hidden md:grid grid-cols-[110px_100px_1fr_150px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                {["Direção", "Canal", "Mensagem", "Data e hora"].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {items.map((c) => {
                const inbound = c.direction === "inbound";
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-1 md:grid-cols-[110px_100px_1fr_150px] gap-1 md:gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <span>
                      <span
                        className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          inbound
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {inbound ? "Recebida" : "Enviada"}
                      </span>
                    </span>

                    <span className="text-[12px] text-slate-500">
                      {CHANNEL_LABELS[c.channel]}
                    </span>

                    <div className="min-w-0">
                      {c.subject && (
                        <p className="text-[13px] font-semibold text-slate-900 mb-0.5">
                          {c.subject}
                        </p>
                      )}
                      {/* Texto puro (nunca HTML): mensagens de clientes são entrada não confiável */}
                      <p className="text-[13px] text-slate-800 whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>

                    <span className="text-[12px] text-slate-400">
                      {formatDateTime(c.sentAt ?? c.createdAt)}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-[12px] rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Mais recentes
              </button>
              <span className="text-[11px] text-slate-400">
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages || loading}
                className="px-3 py-1.5 text-[12px] rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Mais antigas
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}