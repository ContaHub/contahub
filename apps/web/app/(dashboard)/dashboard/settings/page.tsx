"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Save, CheckCircle, AlertTriangle, X, Settings, FlaskConical } from "lucide-react";
import { Card, Button, Toggle, PageHeader } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { getWorkspaceSettings, updateWorkspaceSettings, sendTestEmail } from "@/lib/settings";

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

// ─── Templates disponíveis ────────────────────────────────────

const TEMPLATES = [
  { value: "deadline-alert",       label: "Alerta de Prazo Fiscal" },
  { value: "obligation-completed", label: "Obrigação Concluída" },
  { value: "portal-welcome",       label: "Boas-vindas ao Portal" },
];

// ─── Página ───────────────────────────────────────────────────

export default function SettingsPage() {
  const openMenu = useMobileMenu();
  const [whatsapp, setWhatsapp]       = useState(true);
  const [email, setEmail]             = useState(true);
  const [saving, setSaving]           = useState(false);
  const [testEmail, setTestEmail]     = useState("");
  const [testTemplate, setTestTemplate] = useState("deadline-alert");
  const [testSending, setTestSending] = useState(false);
  const [toast, setToast]             = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    getWorkspaceSettings()
      .then((r) => {
        const channels: string[] = r.notificationChannels || ["WHATSAPP"];
        setWhatsapp(channels.includes("WHATSAPP"));
        setEmail(channels.includes("EMAIL"));
      })
      .catch(() => {});
  }, []);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSave() {
    setSaving(true);
    const channels: string[] = [];
    if (whatsapp) channels.push("WHATSAPP");
    if (email) channels.push("EMAIL");
    try {
      await updateWorkspaceSettings({ notificationChannels: channels });
      showToast("success", "Configurações salvas com sucesso!");
    } catch {
      showToast("error", "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setTestSending(true);
    try {
      await sendTestEmail({ to: testEmail, template: testTemplate });
      showToast("success", "E-mail enviado com sucesso!");
    } catch {
      showToast("error", "Erro ao enviar. Verifique o RESEND_API_KEY.");
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader onMenuClick={openMenu} title="Configurações" subtitle="Canais de notificação" />
      <PageHeader title="Configurações" subtitle="Canais de notificação do escritório" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">

        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {/* ── Canais de notificação ── */}
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Settings size={15} className="text-slate-600" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">Canais de Notificação</h2>
              </div>
              <p className="text-[12px] text-slate-500 mb-5">
                Defina como seus clientes serão notificados sobre prazos e obrigações.
              </p>

              <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[9px] bg-green-50 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={18} className="text-green-700" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">WhatsApp</p>
                    <p className="text-[12px] text-slate-500">Via self-hosted</p>
                  </div>
                </div>
                <Toggle enabled={whatsapp} onChange={setWhatsapp} />
              </div>

              <div className="flex items-center justify-between py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[9px] bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">E-mail</p>
                    <p className="text-[12px] text-slate-500">Via Resend — requer RESEND_API_KEY</p>
                  </div>
                </div>
                <Toggle enabled={email} onChange={setEmail} />
              </div>

              <div className="pt-4">
                <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar configurações"}
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Teste de e-mail ── */}
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FlaskConical size={15} className="text-blue-600" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">Teste de E-mail</h2>
              </div>
              <p className="text-[12px] text-slate-500 mb-5">
                Envie um e-mail de exemplo para validar a integração com o Resend.
              </p>

              <div className="mb-3">
                <label htmlFor="test-email" className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                  Destinatário
                </label>
                <input
                  id="test-email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-colors"
                  placeholder="seu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTestEmail()}
                />
              </div>

              <div className="mb-5">
                <label htmlFor="test-template" className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                  Template
                </label>
                <select
                  id="test-template"
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-colors"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <Button variant="primary" icon={Mail} onClick={handleTestEmail} disabled={testSending || !testEmail}>
                {testSending ? "Enviando…" : "Enviar e-mail de teste"}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Info sobre integrações ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Workers ativos</p>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">FiscalReminderWorker</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">Varredura automática todos os dias às 08h. Dispara alertas para obrigações vencendo em 1, 3 e 7 dias.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">WhatsApp</p>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">WAHA self-hosted</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">Sessão configurada em <span className="font-medium text-slate-500">localhost:3000</span>. Requer sessão ativa para envio.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">E-mail</p>
            <p className="text-[13px] font-semibold text-slate-900 mb-1">Resend</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">3 templates disponíveis: alerta de prazo, conclusão de obrigação e boas-vindas ao portal do cliente.</p>
          </div>
        </div>

      </div>
    </div>
  );
}