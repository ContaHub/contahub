"use client";

import { useEffect, useState } from "react";
import { Send, Bell, Wifi, WifiOff, CheckCircle, AlertTriangle, X, MessageSquare, Mail, Zap } from "lucide-react";
import { Card, Button, PageHeader, SectionHeader } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { getNotificationStatus, sendTestMessage, sendDueAlerts } from "@/lib/notifications";

// ─── Toast ────────────────────────────────────────────────────

function Toast({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between text-[13px] px-4 py-3 rounded-lg mb-4 border ${
      type === "success"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-700"
    }`}>
      <div className="flex items-center gap-2">
        {type === "success"
          ? <CheckCircle size={15} className="flex-shrink-0" />
          : <AlertTriangle size={15} className="flex-shrink-0" />}
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity" aria-label="Fechar">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── StatusIndicator ──────────────────────────────────────────

function StatusIndicator({ status }: { status: "loading" | "connected" | "disconnected" }) {
  if (status === "loading") return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
      <span className="text-[13px] text-slate-400">Verificando conexão…</span>
    </div>
  );
  if (status === "connected") return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(22,163,74,0.15)]" />
      <span className="text-[14px] font-semibold text-slate-800 flex items-center gap-1.5">
        <Wifi size={15} className="text-green-600" /> Conectado
      </span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(220,38,38,0.15)]" />
      <span className="text-[14px] font-semibold text-slate-800 flex items-center gap-1.5">
        <WifiOff size={15} className="text-red-500" /> Desconectado
      </span>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────

export default function NotificationsPage() {
  const openMenu = useMobileMenu();
  const [waStatus, setWaStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [daysAhead, setDaysAhead] = useState(3);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending]   = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [toast, setToast]       = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    getNotificationStatus()
      .then((r) => setWaStatus(r.data?.connected ? "connected" : "disconnected"))
      .catch(() => setWaStatus("disconnected"));
  }, []);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleTest() {
    if (!testPhone) return;
    setSending(true);
    try {
      await sendTestMessage(testPhone);
      showToast("success", "Mensagem de teste enviada com sucesso!");
    } catch {
      showToast("error", "Erro ao enviar. Verifique a conexão WAHA.");
    } finally {
      setSending(false);
    }
  }

  async function handleAlerts() {
    setAlerting(true);
    try {
      const r = await sendDueAlerts(daysAhead);
      showToast("success", `Alertas disparados: ${r.sent ?? 0} enviado${(r.sent ?? 0) !== 1 ? "s" : ""}.`);
    } catch {
      showToast("error", "Erro ao disparar alertas.");
    } finally {
      setAlerting(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader onMenuClick={openMenu} title="Notificações" subtitle="Alertas de prazo" />
      <PageHeader title="Notificações" subtitle="Alertas de prazo via WhatsApp e e-mail" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        {/* ── Grid superior: status + disparar alertas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {/* WhatsApp status */}
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={15} className="text-green-600" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">WhatsApp</h2>
              </div>

              <StatusIndicator status={waStatus} />
              <p className="text-[12px] text-slate-400 mt-1 mb-4">
                Sessão {waStatus === "connected" ? "ativa" : "inativa"}
              </p>

              {waStatus === "disconnected" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[12px] text-blue-700 flex gap-2 items-start">
                  <Bell size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Acesse a{" "}
                    <a href="http://localhost:3000/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Área de configuração
                    </a>{" "}
                    e verifique se a sessão está ativa.
                  </span>
                </div>
              )}

              {waStatus === "connected" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-[12px] text-green-700 flex gap-2 items-start">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Mensagens sendo enviadas normalmente via WAHA.</span>
                </div>
              )}
            </div>
          </Card>

          {/* Disparar alertas */}
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Zap size={15} className="text-amber-600" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">Disparar Alertas de Prazo</h2>
              </div>

              <p className="text-[12px] text-slate-500 mb-4">
                Envia alertas para todos os clientes com obrigações vencendo nos próximos dias.
              </p>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[13px] text-slate-600">Alertar vencendo em</span>
                <select
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                >
                  {[1, 2, 3, 5, 7].map((d) => (
                    <option key={d} value={d}>{d} dia{d > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>

              <Button variant="primary" icon={Send} onClick={handleAlerts} disabled={alerting}>
                {alerting ? "Enviando…" : "Enviar alertas agora"}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Mensagem de teste ── */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Send size={15} className="text-blue-600" />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-900">Mensagem de Teste</h2>
            </div>

            <p className="text-[12px] text-slate-500 mb-4">
              Verifica se a integração está funcionando enviando uma mensagem para qualquer número.
            </p>

            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-colors"
                placeholder="Ex: 11999990000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
              />
              <Button variant="primary" icon={Send} onClick={handleTest} disabled={sending || !testPhone}>
                {sending ? "Enviando…" : "Enviar teste"}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Info sobre canais ── */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900 mb-0.5">WhatsApp</p>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Mensagens disparadas automaticamente pelo <span className="font-medium text-slate-500">FiscalReminderWorker</span> todos os dias às 08h.
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900 mb-0.5">E-mail via Resend</p>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Canal configurável em <span className="font-medium text-slate-500">Configurações → Canais de notificação</span>. Templates disponíveis: alerta de prazo, conclusão e boas-vindas ao portal.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}