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
              clientId: ob.clientId,
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
