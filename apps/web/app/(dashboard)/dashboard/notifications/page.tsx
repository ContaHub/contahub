"use client";

import { useState, useEffect } from "react";
import {
  getNotificationStatus,
  sendTestMessage,
  sendDueAlerts,
  NotificationStatus,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Estado do formulário de teste
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Estado do disparo de alertas
  const [daysAhead, setDaysAhead] = useState(3);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsResult, setAlertsResult] = useState<{ sent: number } | null>(null);

  useEffect(() => {
    getNotificationStatus()
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ connected: false, session: "default", message: "Erro ao conectar" }))
      .finally(() => setStatusLoading(false));
  }, []);

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await sendTestMessage(testPhone);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSendAlerts() {
    setAlertsLoading(true);
    setAlertsResult(null);
    try {
      const result = await sendDueAlerts(daysAhead);
      setAlertsResult({ sent: result.sent });
    } catch (err: any) {
      setAlertsResult({ sent: 0 });
    } finally {
      setAlertsLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie alertas de prazo via WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card — Status da conexão */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Status do WhatsApp</h2>

          {statusLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Verificando conexão...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${status?.connected ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <p className={`text-sm font-medium ${status?.connected ? "text-green-700" : "text-red-700"}`}>
                  {status?.connected ? "Conectado" : "Desconectado"}
                </p>
                <p className="text-xs text-gray-400">{status?.message}</p>
              </div>
            </div>
          )}

          {!status?.connected && !statusLoading && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700">
                Para conectar, acesse o dashboard do WAHA em{" "}
                <a href="http://localhost:3000/dashboard/" target="_blank" className="underline">
                  localhost:3000/dashboard
                </a>{" "}
                e verifique se a sessão está ativa.
              </p>
            </div>
          )}
        </div>

        {/* Card — Disparar alertas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Disparar Alertas de Prazo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Envia WhatsApp para todos os clientes com obrigações vencendo nos próximos dias.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-700">Alertar obrigações vencendo em</label>
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 dia</option>
              <option value={2}>2 dias</option>
              <option value={3}>3 dias</option>
              <option value={5}>5 dias</option>
              <option value={7}>7 dias</option>
            </select>
          </div>

          <button
            onClick={handleSendAlerts}
            disabled={alertsLoading || !status?.connected}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {alertsLoading ? "Enviando..." : "📲 Enviar alertas agora"}
          </button>

          {alertsResult && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${alertsResult.sent > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}>
              {alertsResult.sent > 0
                ? `✅ ${alertsResult.sent} mensagem${alertsResult.sent !== 1 ? "ns" : ""} enviada${alertsResult.sent !== 1 ? "s" : ""} com sucesso!`
                : "Nenhuma obrigação vencendo nesse período ou nenhum cliente com WhatsApp cadastrado."}
            </div>
          )}
        </div>

        {/* Card — Mensagem de teste */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Enviar Mensagem de Teste</h2>
          <p className="text-sm text-gray-500 mb-4">
            Verifica se a integração está funcionando enviando uma mensagem para qualquer número.
          </p>

          <form onSubmit={handleTest} className="flex gap-3">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Ex: 11999990000"
              required
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={testLoading || !status?.connected}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {testLoading ? "Enviando..." : "Enviar teste"}
            </button>
          </form>

          {testResult && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.success ? "✅" : "❌"} {testResult.message}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
