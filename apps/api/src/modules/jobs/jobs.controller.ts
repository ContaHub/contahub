import { Controller, Post, Body, Req } from "@nestjs/common";
import { JobsProducerService } from "./jobs-producer.service";

interface AuthRequest extends Request {
  workspaceId: string;
  workspaceName?: string;
}

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsProducer: JobsProducerService) {}

  /** POST /api/v1/jobs/fiscal-scan — dispara varredura manual */
  @Post("fiscal-scan")
  async triggerFiscalScan() {
    const jobId = await this.jobsProducer.triggerFiscalScan();
    return { data: { jobId, queued: true }, message: "Varredura fiscal enfileirada" };
  }

  /**
   * POST /api/v1/jobs/test-email
   * Body: { "to": "email@exemplo.com", "template": "deadline-alert" }
   * Envia um e-mail de exemplo para validar a integração com o Resend
   */
  @Post("test-email")
  async testEmail(
    @Body() body: { to: string; template?: string }
  ) {
    const template = (body.template ?? "deadline-alert") as
      | "deadline-alert"
      | "obligation-completed"
      | "portal-welcome";

    const payloadMap: Record<string, object> = {
      "deadline-alert": {
        obligationType: "DAS",
        clientName: "Padaria São João Ltda",
        dueDate: "30/05/2026",
        daysUntil: 3,
        workspaceName: "Escritório Contábil Demo",
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/portal/demo-escritorio`,
      },
      "obligation-completed": {
        obligationType: "DARF",
        clientName: "Tech Solutions ME",
        completedAt: "24/05/2026 às 14h30",
        workspaceName: "Escritório Contábil Demo",
        accountantName: "William",
      },
      "portal-welcome": {
        workspaceName: "Escritório Contábil Demo",
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/portal/demo-escritorio`,
      },
    };

    const jobId = await this.jobsProducer.queueEmail({
      template,
      to: body.to,
      recipientName: "Teste ContaHub",
      payload: payloadMap[template] as never,
    });

    return {
      data: { jobId, template, to: body.to },
      message: `E-mail [${template}] enfileirado para ${body.to}. Verifique a caixa de entrada.`,
    };
  }

  /**
   * POST /api/v1/jobs/welcome-email
   * Chamado quando o contador habilita o portal para um cliente
   * Body: { "email": "cliente@email.com", "clientName": "João", "slug": "demo-escritorio" }
   */
  @Post("welcome-email")
  async sendWelcomeEmail(
    @Body() body: { email: string; clientName: string; slug: string },
    @Req() req: AuthRequest
  ) {
    const workspaceName = req.workspaceName ?? "Seu Escritório Contábil";
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/portal/${body.slug}`;

    const jobId = await this.jobsProducer.queuePortalWelcome({
      email: body.email,
      recipientName: body.clientName,
      workspaceName,
      portalUrl,
    });

    return {
      data: { jobId },
      message: `E-mail de boas-vindas enfileirado para ${body.email}`,
    };
  }
}
