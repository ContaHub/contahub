#!/bin/bash
# ContaHub — Módulo de Notificações (WhatsApp via WAHA + BullMQ)
# Execute na raiz do projeto: bash criar-notificacoes.sh

set -e
echo "🔔 Criando módulo de notificações..."

# ================================================================
# 1. VARIÁVEIS DE AMBIENTE — adiciona WAHA ao .env.example
# ================================================================
cat >> .env.example << 'EOF'

# ----- WAHA (WhatsApp) -----
WAHA_URL="http://localhost:3000"
WAHA_API_KEY="sua_api_key_aqui"
WAHA_SESSION="default"

# ----- Redis (BullMQ jobs) -----
REDIS_URL="redis://localhost:6379"
EOF

# ================================================================
# 2. BACKEND — Serviço WAHA (cliente HTTP para a API do WAHA)
# ================================================================
mkdir -p apps/api/src/modules/notifications
mkdir -p apps/api/src/common/services

cat > apps/api/src/common/services/waha.service.ts << 'EOF'
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Tipagem das mensagens que o WAHA aceita
interface TextMessage {
  chatId: string;   // formato: "5511999990000@c.us"
  text: string;
  session: string;
}

interface SendResult {
  id: string;
  timestamp: number;
}

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly session: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get("WAHA_URL") || "http://localhost:3000";
    this.apiKey = this.config.get("WAHA_API_KEY") || "";
    this.session = this.config.get("WAHA_SESSION") || "default";
  }

  // Formata número brasileiro para o formato do WhatsApp
  // "11999990000" → "5511999990000@c.us"
  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    // Adiciona DDI 55 se não tiver
    const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
    return `${withDdi}@c.us`;
  }

  // Verifica se a sessão do WAHA está ativa
  async isSessionActive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${this.session}`, {
        headers: { "X-Api-Key": this.apiKey },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "WORKING";
    } catch {
      return false;
    }
  }

  // Envia mensagem de texto para um número
  async sendText(phone: string, message: string): Promise<SendResult | null> {
    try {
      const chatId = this.formatPhoneNumber(phone);
      const body: TextMessage = {
        chatId,
        text: message,
        session: this.session,
      };

      const res = await fetch(`${this.baseUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        this.logger.error(`WAHA sendText falhou: ${error}`);
        return null;
      }

      const result = await res.json();
      this.logger.log(`✅ WhatsApp enviado para ${phone}`);
      return result;
    } catch (err) {
      this.logger.error(`Erro ao enviar WhatsApp: ${err}`);
      return null;
    }
  }
}
EOF

# ================================================================
# 3. BACKEND — Templates de mensagens WhatsApp
# ================================================================
cat > apps/api/src/common/services/notification-templates.ts << 'EOF'
// Templates de mensagens para o contador e para o cliente
// Separados por tipo para facilitar personalização futura

export const NotificationTemplates = {
  // Alerta enviado ao CONTADOR sobre obrigação próxima do vencimento
  dueSoonAccountant: (data: {
    clientName: string;
    obligationType: string;
    dueDate: string;
    daysLeft: number;
  }) => `
⚠️ *ContaHub — Alerta de Prazo*

Olá! Uma obrigação está próxima do vencimento:

🏢 *Cliente:* ${data.clientName}
📋 *Obrigação:* ${data.obligationType}
📅 *Vencimento:* ${data.dueDate}
⏰ *Prazo:* ${data.daysLeft} dia${data.daysLeft !== 1 ? "s" : ""}

Acesse o ContaHub para mais detalhes.
`.trim(),

  // Alerta enviado ao CLIENTE sobre documento pendente
  dueSoonClient: (data: {
    clientName: string;
    obligationType: string;
    dueDate: string;
    daysLeft: number;
    accountantName: string;
  }) => `
📊 *${data.accountantName} — Lembrete Fiscal*

Olá, ${data.clientName}!

Sua empresa tem uma obrigação fiscal com prazo próximo:

📋 *${data.obligationType}*
📅 Vencimento: *${data.dueDate}*
⏰ Faltam *${data.daysLeft} dia${data.daysLeft !== 1 ? "s" : ""}*

Em caso de dúvidas, entre em contato conosco.
`.trim(),

  // Confirmação de conclusão de obrigação
  obligationCompleted: (data: {
    clientName: string;
    obligationType: string;
    competence: string;
  }) => `
✅ *ContaHub — Obrigação Concluída*

A obrigação *${data.obligationType}* de ${data.competence} para *${data.clientName}* foi concluída com sucesso!
`.trim(),
};
EOF

# ================================================================
# 4. BACKEND — Módulo de notificações (controller + service)
# ================================================================
cat > apps/api/src/modules/notifications/notifications.module.ts << 'EOF'
import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { WahaService } from "../../common/services/waha.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WahaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
EOF

cat > apps/api/src/modules/notifications/notifications.service.ts << 'EOF'
import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { WahaService } from "../../common/services/waha.service";
import { NotificationTemplates } from "../../common/services/notification-templates";

const OBLIGATION_LABELS: Record<string, string> = {
  DARF: "DARF", DAS: "DAS (Simples Nacional)", DEFIS: "DEFIS",
  SPED_CONTABIL: "SPED Contábil", SPED_FISCAL: "SPED Fiscal",
  SPED_CONTRIBUICOES: "SPED Contribuições", ECFD: "ECFD", DCTF: "DCTF",
  REINF: "EFD-Reinf", ESOCIAL: "eSocial", DIRF: "DIRF",
  RAIS: "RAIS", GIA: "GIA", PGDAS: "PGDAS-D", OUTRO: "Outro",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly waha: WahaService) {}

  // Envia alerta manual para um número específico (teste)
  async sendTestMessage(phone: string, workspaceId: string) {
    const isActive = await this.waha.isSessionActive();
    if (!isActive) {
      return { success: false, message: "Sessão WAHA não está ativa" };
    }

    const result = await this.waha.sendText(
      phone,
      "✅ *ContaHub* — Integração WhatsApp funcionando! 🎉"
    );

    return {
      success: !!result,
      message: result ? "Mensagem enviada com sucesso!" : "Falha ao enviar mensagem",
    };
  }

  // Verifica obrigações próximas do vencimento e envia alertas
  // Chamado automaticamente pelo job diário
  async sendDueSoonAlerts(workspaceId: string, daysAhead = 3) {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Busca obrigações pendentes vencendo nos próximos N dias
    const obligations = await prisma.fiscalObligation.findMany({
      where: {
        workspaceId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: now, lte: future },
      },
      include: {
        client: {
          select: {
            name: true,
            whatsapp: true,
            phone: true,
          },
        },
        workspace: {
          select: { name: true },
        },
      },
    });

    if (obligations.length === 0) {
      this.logger.log(`Nenhuma obrigação vencendo nos próximos ${daysAhead} dias`);
      return { sent: 0, obligations: [] };
    }

    const results = [];

    for (const ob of obligations) {
      const daysLeft = Math.ceil(
        (new Date(ob.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dueDate = new Date(ob.dueDate).toLocaleDateString("pt-BR");
      const obligationType = OBLIGATION_LABELS[ob.type] || ob.type;

      // Envia para o WhatsApp do cliente (se tiver)
      const clientPhone = ob.client.whatsapp || ob.client.phone;
      if (clientPhone) {
        const message = NotificationTemplates.dueSoonClient({
          clientName: ob.client.name,
          obligationType,
          dueDate,
          daysLeft,
          accountantName: ob.workspace.name,
        });

        const result = await this.waha.sendText(clientPhone, message);
        results.push({
          obligationId: ob.id,
          recipient: "client",
          phone: clientPhone,
          success: !!result,
        });

        // Registra no histórico de comunicações
        if (result) {
          await prisma.communication.create({
            data: {
              workspaceId,
              clientId: (ob as any).clientId,
              channel: "WHATSAPP",
              direction: "outbound",
              subject: `Alerta: ${obligationType} vence em ${daysLeft} dia(s)`,
              content: message,
              sentAt: new Date(),
            },
          });
        }
      }

      this.logger.log(
        `Alerta enviado: ${ob.client.name} — ${obligationType} (${daysLeft} dias)`
      );
    }

    return { sent: results.filter((r) => r.success).length, obligations: results };
  }

  // Envia notificação quando uma obrigação é concluída
  async sendCompletionNotification(obligationId: string, workspaceId: string) {
    const ob = await prisma.fiscalObligation.findFirst({
      where: { id: obligationId, workspaceId },
      include: {
        client: { select: { name: true, whatsapp: true, phone: true } },
      },
    });

    if (!ob) return { success: false, message: "Obrigação não encontrada" };

    const clientPhone = ob.client.whatsapp || ob.client.phone;
    if (!clientPhone) return { success: false, message: "Cliente sem WhatsApp cadastrado" };

    const competence = `${MONTHS[ob.competenceMonth - 1]}/${ob.competenceYear}`;
    const message = NotificationTemplates.obligationCompleted({
      clientName: ob.client.name,
      obligationType: OBLIGATION_LABELS[ob.type] || ob.type,
      competence,
    });

    const result = await this.waha.sendText(clientPhone, message);
    return {
      success: !!result,
      message: result ? "Notificação enviada!" : "Falha ao enviar",
    };
  }

  // Retorna status da conexão WAHA
  async getStatus() {
    const isActive = await this.waha.isSessionActive();
    return {
      data: {
        connected: isActive,
        session: process.env.WAHA_SESSION || "default",
        message: isActive ? "WhatsApp conectado e funcionando" : "Sessão WAHA inativa",
      },
    };
  }
}
EOF

cat > apps/api/src/modules/notifications/notifications.controller.ts << 'EOF'
import { Controller, Get, Post, Body, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { NotificationsService } from "./notifications.service";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

class SendTestDto {
  @IsString()
  phone!: string;
}

class SendAlertsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  daysAhead?: number;
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/v1/notifications/status — verifica se o WAHA está conectado
  @Get("status")
  async getStatus() {
    return this.notificationsService.getStatus();
  }

  // POST /api/v1/notifications/test — envia mensagem de teste
  @Post("test")
  async sendTest(@Req() req: Request, @Body() dto: SendTestDto) {
    return this.notificationsService.sendTestMessage(dto.phone, req.workspaceId);
  }

  // POST /api/v1/notifications/alerts — dispara alertas de prazo manualmente
  @Post("alerts")
  async sendAlerts(@Req() req: Request, @Body() dto: SendAlertsDto) {
    return this.notificationsService.sendDueSoonAlerts(
      req.workspaceId,
      dto.daysAhead || 3
    );
  }

  // POST /api/v1/notifications/complete/:id — notifica conclusão de obrigação
  @Post("complete/:id")
  async sendCompletion(@Req() req: Request, @Param("id") id: string) {
    return this.notificationsService.sendCompletionNotification(id, req.workspaceId);
  }
}
EOF

# ================================================================
# 5. BACKEND — Registra NotificationsModule no AppModule
# ================================================================
cat > apps/api/src/app.module.ts << 'EOF'
import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkspaceMiddleware } from "./common/middleware/workspace.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { FiscalModule } from "./modules/fiscal/fiscal.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ClientsModule,
    FiscalModule,
    DashboardModule,
    NotificationsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WorkspaceMiddleware)
      .exclude({ path: "api/v1/health", method: RequestMethod.GET })
      .forRoutes("*");
  }
}
EOF

# ================================================================
# 6. FRONTEND — Página de Notificações no dashboard
# ================================================================
mkdir -p "apps/web/app/(dashboard)/dashboard/notifications"

cat > "apps/web/lib/notifications.ts" << 'EOF'
import { apiFetch } from "./api";

export interface NotificationStatus {
  connected: boolean;
  session: string;
  message: string;
}

export interface AlertResult {
  sent: number;
  obligations: Array<{
    obligationId: string;
    recipient: string;
    phone: string;
    success: boolean;
  }>;
}

export async function getNotificationStatus(): Promise<{ data: NotificationStatus }> {
  return apiFetch("/notifications/status");
}

export async function sendTestMessage(phone: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("/notifications/test", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function sendDueAlerts(daysAhead: number): Promise<{ sent: number; obligations: AlertResult["obligations"] }> {
  return apiFetch("/notifications/alerts", {
    method: "POST",
    body: JSON.stringify({ daysAhead }),
  });
}
EOF

cat > "apps/web/app/(dashboard)/dashboard/notifications/page.tsx" << 'EOF'
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
EOF

# ================================================================
# 7. FRONTEND — Adiciona link "Notificações" na sidebar
# ================================================================
cat > "apps/web/app/(dashboard)/layout.tsx" << 'EOF'
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex items-center p-6 border-b">
          <span className="text-xl font-bold text-blue-600">ContaHub</span>
        </div>
        <nav className="p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            👥 Clientes
          </Link>
          <Link href="/dashboard/fiscal" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            📋 Fiscal
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            🔔 Notificações
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
EOF

# ================================================================
# 8. Atualiza .env.local e apps/web/.env.local com vars do WAHA
# ================================================================
echo "" >> .env.local
echo "# WAHA (WhatsApp)" >> .env.local
echo "WAHA_URL=http://localhost:3000" >> .env.local
echo "WAHA_API_KEY=c8919e287dc149aea30c3e627dcbbcf5" >> .env.local
echo "WAHA_SESSION=default" >> .env.local

# Também no .env do database (para o Prisma não reclamar)
echo "" >> packages/database/.env
echo "WAHA_URL=http://localhost:3000" >> packages/database/.env
echo "WAHA_API_KEY=c8919e287dc149aea30c3e627dcbbcf5" >> packages/database/.env
echo "WAHA_SESSION=default" >> packages/database/.env

echo ""
echo "✅ Módulo de notificações criado!"
echo ""
echo "Arquivos gerados:"
echo "  apps/api/src/common/services/waha.service.ts"
echo "  apps/api/src/common/services/notification-templates.ts"
echo "  apps/api/src/modules/notifications/ (3 arquivos)"
echo "  apps/web/lib/notifications.ts"
echo "  apps/web/app/(dashboard)/dashboard/notifications/page.tsx"
echo ""
echo "Próximo passo: reiniciar a API (pnpm dev)"
