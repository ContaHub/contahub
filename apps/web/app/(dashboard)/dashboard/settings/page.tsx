"use client";

import { useState, useEffect } from "react";
import {
  getWorkspaceSettings,
  updateNotificationChannels,
  sendTestEmail,
} from "@/lib/settings";

export default function SettingsPage() {
  const [channels, setChannels] = useState<string[]>(["WHATSAPP"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState("deadline-alert");
  const [testSending, setTestSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    getWorkspaceSettings()
      .then((s) => setChannels(s.notificationChannels))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleSave() {
    if (channels.length === 0) {
      showFeedback("error", "Selecione pelo menos um canal de notificação.");
      return;
    }
    setSaving(true);
    try {
      await updateNotificationChannels(channels);
      showFeedback("success", "Configurações salvas com sucesso!");
    } catch {
      showFeedback("error", "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testTo) {
      showFeedback("error", "Informe um e-mail de destino.");
      return;
    }
    setTestSending(true);
    try {
      const { jobId } = await sendTestEmail(testTo, testTemplate);
      showFeedback("success", `E-mail "${testTemplate === "deadline-alert" ? "Alerta de Prazo Fiscal" : testTemplate === "obligation-completed" ? "Obrigação Concluída" : "Boas-vindas ao Portal"}" enviado com sucesso. Verifique a caixa de entrada.`);
    } catch {
      showFeedback("error", "Erro ao enviar. Verifique se RESEND_API_KEY está configurada.");
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie os canais de notificação do escritório.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Canais */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800">Canais de Notificação</h2>
        <p className="mt-1 text-sm text-gray-500">
          Defina como seus clientes serão notificados sobre prazos e obrigações.
        </p>

        <div className="mt-5 space-y-3">
          {[
            {
              key: "WHATSAPP",
              label: "WhatsApp",
              icon: "💬",
              hint: "Via WAHA self-hosted — requer número ativo",
              activeColor: "bg-blue-500",
            },
            {
              key: "EMAIL",
              label: "E-mail",
              icon: "📧",
              hint: "Via Resend — requer RESEND_API_KEY no .env.local",
              activeColor: "bg-blue-500",
            },
          ].map(({ key, label, icon, hint, activeColor }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{icon}</span>
                <div>
                  <p className="font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{hint}</p>
                </div>
              </div>
              <button
                onClick={() => toggleChannel(key)}
                role="switch"
                aria-checked={channels.includes(key)}
                aria-label={`${channels.includes(key) ? "Desativar" : "Ativar"} ${label}`}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                  channels.includes(key)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-500 border-gray-300"
                }`}
                >
                {channels.includes(key) ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </section>

      {/* Teste de e-mail */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800">Teste de E-mail</h2>
        <p className="mt-1 text-sm text-gray-500">
          Envie um e-mail de exemplo para validar a integração com o Resend.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="test-email-to" className="block text-sm font-medium text-gray-700">
              Destinatário
            </label>
            <input
              id="test-email-to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="test-template" className="block text-sm font-medium text-gray-700">
              Template
            </label>
            <select
              id="test-template"
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="deadline-alert">Alerta de Prazo Fiscal</option>
              <option value="obligation-completed">Obrigação Concluída</option>
              <option value="portal-welcome">Boas-vindas ao Portal</option>
            </select>
          </div>

          <button
            onClick={handleTestEmail}
            disabled={testSending}
            className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {testSending ? "Enfileirando..." : "Enviar E-mail de Teste"}
          </button>
        </div>
      </section>
    </div>
  );
}
