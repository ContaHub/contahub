"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function ClientCommunicationsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

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
      setError(err instanceof Error ? err.message : "Erro ao carregar comunicações");
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/clients")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Comunicações — {clientName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta ? `${meta.total} mensagem(ns) no histórico` : "Carregando..."}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="font-medium">Nenhuma comunicação registrada</p>
          <p className="text-sm text-gray-400 mt-1">
            As mensagens trocadas com este cliente aparecerão aqui.
          </p>
        </div>
      )}

      {/* Lista: recebidas à esquerda, enviadas à direita */}
      <div className="space-y-3">
        {items.map((c) => {
          const inbound = c.direction === "inbound";
          return (
            <div key={c.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-xl border px-4 py-3 ${
                  inbound ? "bg-white border-gray-200" : "bg-blue-50 border-blue-100"
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
                  <span className="font-semibold">{inbound ? "Recebida" : "Enviada"}</span>
                  <span>·</span>
                  <span>{CHANNEL_LABELS[c.channel]}</span>
                  <span>·</span>
                  <span>{formatDateTime(c.sentAt ?? c.createdAt)}</span>
                </div>
                {c.subject && (
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{c.subject}</p>
                )}
                {/* whitespace-pre-wrap preserva quebras de linha das mensagens de WhatsApp */}
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {c.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Mais recentes
          </button>
          <span className="text-xs text-gray-500">
            Página {meta.page} de {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages || loading}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Mais antigas
          </button>
        </div>
      )}
    </div>
  );
}