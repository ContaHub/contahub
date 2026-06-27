/**
 * EmailService — cliente Resend para envio de e-mails transacionais
 *
 * Fluxo: NotificationWorker → EmailService.send() → Resend API → caixa do destinatário
 */
import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { render } from "@react-email/render";
import * as React from "react";
import type {
  SendEmailJobData,
  DeadlineAlertPayload,
  ObligationCompletedPayload,
  PortalWelcomePayload,
  WorkspaceWelcomePayload,
} from "@contahub/shared";

import DeadlineAlertEmail from "../emails/deadline-alert";
import ObligationCompletedEmail from "../emails/obligation-completed";
import PortalWelcomeEmail from "../emails/portal-welcome";
import WorkspaceWelcomeEmail from "../emails/workspace-welcome";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get resend(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY não configurada. Adicione ao .env.local e reinicie."
      );
    }
    return new Resend(apiKey);
  }

  async send(job: SendEmailJobData): Promise<{ id: string }> {
    const { template, to, recipientName, payload } = job;
    const { html, subject } = await this.renderTemplate(template, recipientName, payload);

    this.logger.log(`Enviando e-mail [${template}] para ${to}`);

    const { data, error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "ContaHub <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Erro Resend: ${JSON.stringify(error)}`);
      throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    }

    this.logger.log(`E-mail enviado — ID Resend: ${data!.id}`);
    return { id: data!.id };
  }

  private async renderTemplate(
    template: SendEmailJobData["template"],
    recipientName: string,
    payload: SendEmailJobData["payload"]
  ): Promise<{ html: string; subject: string }> {
    switch (template) {
      case "deadline-alert": {
        const p = payload as DeadlineAlertPayload;
        const subject =
          p.daysUntil === 1
            ? `URGENTE: ${p.obligationType} de ${p.clientName} vence AMANHÃ`
            : `Lembrete: ${p.obligationType} de ${p.clientName} vence em ${p.daysUntil} dias`;
        const html = await render(
          React.createElement(DeadlineAlertEmail, { recipientName, payload: p })
        );
        return { html, subject };
      }

      case "obligation-completed": {
        const p = payload as ObligationCompletedPayload;
        const html = await render(
          React.createElement(ObligationCompletedEmail, { recipientName, payload: p })
        );
        return {
          html,
          subject: `${p.obligationType} de ${p.clientName} foi concluída`,
        };
      }

      case "portal-welcome": {
        const p = payload as PortalWelcomePayload;
        const html = await render(
          React.createElement(PortalWelcomeEmail, { recipientName, payload: p })
        );
        return {
          html,
          subject: `Seu acesso ao portal do ${p.workspaceName} foi criado`,
        };
      }

      // ── NOVO ─────────────────────────────────────────────────────────────
      case "workspace-welcome": {
        const p = payload as WorkspaceWelcomePayload;
        const html = await render(
          React.createElement(WorkspaceWelcomeEmail, { recipientName, payload: p })
        );
        return {
          html,
          subject: `Bem-vindo ao ContaHub! Seu escritório está pronto 🎉`,
        };
      }

      default:
        throw new Error(`Template desconhecido: ${template as string}`);
    }
  }
}