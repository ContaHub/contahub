/**
 * EmailService — cliente Resend para envio de e-mails transacionais
 *
 * Por que Resend?
 * - API simples com suporte nativo a React Email
 * - 3.000 e-mails/mês no plano gratuito
 * - Entregabilidade superior ao SendGrid para domínios novos
 *
 * Fluxo: NotificationWorker → EmailService.send() → Resend API → caixa do cliente
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
} from "@contahub/shared";

import DeadlineAlertEmail from "../emails/deadline-alert";
import ObligationCompletedEmail from "../emails/obligation-completed";
import PortalWelcomeEmail from "../emails/portal-welcome";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // Lazy getter — instancia o cliente Resend apenas quando usado
  // Garante que erro de RESEND_API_KEY ausente ocorra no momento do uso,
  // não na inicialização do módulo
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
      // Sandbox: usar onboarding@resend.dev (funciona sem verificar domínio)
      // Produção: trocar por noreply@seudominio.com.br após verificar no Resend
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
            ? `URGENTE: ${p.obligationType} de ${p.clientName} vence AMANHA`
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
          subject: `${p.obligationType} de ${p.clientName} foi concluida`,
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

      default:
        throw new Error(`Template desconhecido: ${template as string}`);
    }
  }
}
