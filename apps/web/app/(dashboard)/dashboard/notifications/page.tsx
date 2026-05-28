"use client";

import { useEffect, useState } from "react";
import { Send, Bell, Wifi, WifiOff } from "lucide-react";
import { Card, Button, PageHeader } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { getNotificationStatus, sendTestMessage, sendDueAlerts } from "@/lib/notifications";

export default function NotificationsPage() {
  const openMenu = useMobileMenu();
  const [waStatus, setWaStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [daysAhead, setDaysAhead] = useState(3);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    getNotificationStatus()
      .then((r) => setWaStatus(r.data?.connected ? "connected" : "disconnected"))
      .catch(() => setWaStatus("disconnected"));
  }, []);

  async function handleTest() {
    if (!testPhone) return;
    setSending(true);
    setFeedback("");
    try {
      await sendTestMessage(testPhone);
      setFeedback("Mensagem de teste enviada com sucesso!");
    } catch {
      setFeedback("Erro ao enviar. Verifique a conexão WAHA.");
    } finally {
      setSending(false);
    }
  }

  async function handleAlerts() {
    setAlerting(true);
    setFeedback("");
    try {
      const r = await sendDueAlerts(daysAhead);
      setFeedback(`Alertas disparados: ${r.sent ?? 0} enviados.`);
    } catch {
      setFeedback("Erro ao disparar alertas.");
    } finally {
      setAlerting(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader
        onMenuClick={openMenu}
        title="Notificações"
        subtitle="Alertas de prazo"
      />
      <PageHeader
        title="Notificações"
        subtitle="Alertas de prazo via WhatsApp e e-mail"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {/* Top 2 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {/* WhatsApp status */}
          <Card className="p-5">
            <h2 className="text-[14px] font-bold text-slate-900 mb-4">WhatsApp — WAHA</h2>
            <div className="flex items-center gap-2.5 mb-1.5">
              {waStatus === "loading" ? (
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
              ) : waStatus === "connected" ? (
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(22,163,74,0.12)]" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(220,38,38,0.12)]" />
              )}
              {waStatus === "connected" ? (
                <span className="text-[14px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <Wifi size={15} className="text-green-600" /> Conectado
                </span>
              ) : (
                <span className="text-[14px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <WifiOff size={15} className="text-red-500" /> Desconectado
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 mb-4">Sessão WAHA {waStatus === "connected" ? "ativa" : "inativa"}</p>
            {waStatus !== "connected" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-700 flex gap-2">
                <Bell size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Acesse{" "}
                  <a
                    href="http://localhost:3000/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    localhost:3000/dashboard
                  </a>{" "}
                  e verifique se a sessão está ativa.
                </span>
              </div>
            )}
          </Card>

          {/* Disparar alertas */}
          <Card className="p-5">
            <h2 className="text-[14px] font-bold text-slate-900 mb-2">Disparar Alertas de Prazo</h2>
            <p className="text-[12px] text-slate-500 mb-4">
              Envia alertas para todos os clientes com obrigações vencendo nos próximos dias.
            </p>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[13px] text-slate-600">Alertar vencendo em</span>
              <select
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-700 focus:outline-none focus:border-blue-400"
              >
                {[1, 2, 3, 5, 7].map((d) => (
                  <option key={d} value={d}>{d} dia{d > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              icon={Send}
              onClick={handleAlerts}
              disabled={alerting}
              className="w-full justify-center"
            >
              {alerting ? "Enviando..." : "Enviar alertas agora"}
            </Button>
          </Card>
        </div>

        {/* Test message */}
        <Card className="p-5">
          <h2 className="text-[14px] font-bold text-slate-900 mb-2">Mensagem de Teste</h2>
          <p className="text-[12px] text-slate-500 mb-4">
            Verifica se a integração está funcionando enviando uma mensagem para qualquer número.
          </p>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              placeholder="Ex: 11999990000"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Button
              variant="primary"
              icon={Send}
              onClick={handleTest}
              disabled={sending || !testPhone}
            >
              {sending ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
          {feedback && (
            <p className="mt-3 text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {feedback}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
