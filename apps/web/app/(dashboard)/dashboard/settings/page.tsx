"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Save } from "lucide-react";
import { Card, Button, Toggle, PageHeader } from "@/components/ui";
import { MobileHeader, useMobileMenu } from "@/components/layout/mobile-menu";
import { getWorkspaceSettings, updateWorkspaceSettings, sendTestEmail } from "@/lib/settings";

const TEMPLATES = [
  { value: "deadline-alert",        label: "Alerta de Prazo Fiscal" },
  { value: "obligation-completed",  label: "Obrigação Concluída" },
  { value: "portal-welcome",        label: "Boas-vindas ao Portal" },
];

export default function SettingsPage() {
  const openMenu = useMobileMenu();
  const [whatsapp, setWhatsapp] = useState(true);
  const [email, setEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [testTemplate, setTestTemplate] = useState("deadline-alert");
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState("");

  useEffect(() => {
    getWorkspaceSettings()
      .then((r) => {
        const channels: string[] = r.notificationChannels || ["WHATSAPP"];
        setWhatsapp(channels.includes("WHATSAPP"));
        setEmail(channels.includes("EMAIL"));
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSavedMsg("");
    const channels: string[] = [];
    if (whatsapp) channels.push("WHATSAPP");
    if (email) channels.push("EMAIL");
    try {
      await updateWorkspaceSettings({ notificationChannels: channels });
      setSavedMsg("Configurações salvas com sucesso!");
    } catch {
      setSavedMsg("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setTestSending(true);
    setTestFeedback("");
    try {
      await sendTestEmail({ to: testEmail, template: testTemplate });
      setTestFeedback("E-mail enviado com sucesso!");
    } catch {
      setTestFeedback("Erro ao enviar. Verifique o RESEND_API_KEY.");
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MobileHeader
        onMenuClick={openMenu}
        title="Configurações"
        subtitle="Canais de notificação"
      />
      <PageHeader
        title="Configurações"
        subtitle="Canais de notificação do escritório"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">

          {/* Notification channels */}
          <Card className="p-5">
            <h2 className="text-[14px] font-bold text-slate-900 mb-1">Canais de Notificação</h2>
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
                  <p className="text-[12px] text-slate-500">Via WAHA self-hosted</p>
                </div>
              </div>
              <Toggle enabled={whatsapp} onChange={setWhatsapp} />
            </div>

            <div className="flex items-center justify-between py-3.5">
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

            <div className="mt-5">
              <Button
                variant="primary"
                icon={Save}
                onClick={handleSave}
                disabled={saving}
                className="w-full justify-center"
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
              {savedMsg && (
                <p className="mt-2 text-[12px] text-slate-600 text-center">{savedMsg}</p>
              )}
            </div>
          </Card>

          {/* Email test */}
          <Card className="p-5">
            <h2 className="text-[14px] font-bold text-slate-900 mb-1">Teste de E-mail</h2>
            <p className="text-[12px] text-slate-500 mb-5">
              Envie um e-mail de exemplo para validar a integração com o Resend.
            </p>

            <div className="mb-3">
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                Destinatário
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                placeholder="seu@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                Template
              </label>
              <select
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              icon={Mail}
              onClick={handleTestEmail}
              disabled={testSending || !testEmail}
              className="w-full justify-content"
            >
              {testSending ? "Enviando..." : "Enviar E-mail de Teste"}
            </Button>
            {testFeedback && (
              <p className="mt-2 text-[12px] text-slate-600 text-center">{testFeedback}</p>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
