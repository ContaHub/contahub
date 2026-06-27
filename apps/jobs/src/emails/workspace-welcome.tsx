/**
 * Template: workspace-welcome
 *
 * Enviado ao contador logo após criar a conta no ContaHub.
 * Objetivo: confirmar o cadastro, mostrar os dias de trial e
 * levar o usuário direto para o dashboard com um CTA claro.
 *
 * Localização: apps/jobs/src/emails/workspace-welcome.tsx
 */

import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";
import type { WorkspaceWelcomePayload } from "@contahub/shared";

interface WorkspaceWelcomeEmailProps {
  recipientName: string;
  payload: WorkspaceWelcomePayload;
}

export default function WorkspaceWelcomeEmail({
  recipientName,
  payload,
}: WorkspaceWelcomeEmailProps) {
  const { workspaceName, dashboardUrl, trialDays } = payload;

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Bem-vindo ao ContaHub! Seu escritório está pronto para começar.
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.logo}>ContaHub</Text>
          </Section>

          {/* Conteúdo principal */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Olá, {recipientName}! 👋
            </Text>

            <Text style={styles.paragraph}>
              Sua conta no <strong>ContaHub</strong> foi criada com sucesso.
              O escritório <strong>{workspaceName}</strong> está pronto para
              receber seus clientes e automatizar suas obrigações fiscais.
            </Text>

            {/* Card do trial */}
            <Section style={styles.trialCard}>
              <Text style={styles.trialTitle}>
                🎉 {trialDays} dias de teste gratuito
              </Text>
              <Text style={styles.trialText}>
                Explore todos os recursos sem limitações. Adicione clientes,
                gerencie obrigações fiscais, envie documentos e muito mais —
                tudo sem precisar de cartão de crédito.
              </Text>
            </Section>

            {/* O que você pode fazer */}
            <Text style={styles.sectionTitle}>O que você pode fazer agora:</Text>
            <Text style={styles.listItem}>✓ Cadastrar seus clientes (com busca automática de CNPJ)</Text>
            <Text style={styles.listItem}>✓ Gerenciar obrigações fiscais e prazos</Text>
            <Text style={styles.listItem}>✓ Fazer upload e compartilhar documentos</Text>
            <Text style={styles.listItem}>✓ Enviar notificações por WhatsApp e e-mail</Text>
            <Text style={styles.listItem}>✓ Habilitar o portal do cliente</Text>

            {/* CTA */}
            <Section style={styles.ctaSection}>
              <Button href={dashboardUrl} style={styles.button}>
                Acessar o Dashboard
              </Button>
            </Section>

            <Text style={styles.paragraph}>
              Qualquer dúvida, basta responder este e-mail. Estamos aqui para
              ajudar.
            </Text>

            <Text style={styles.signature}>
              Equipe ContaHub
            </Text>
          </Section>

          <Hr style={styles.hr} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              ContaHub — Gestão para escritórios de contabilidade
            </Text>
            <Text style={styles.footerText}>
              Você recebeu este e-mail porque criou uma conta no ContaHub.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ─── Estilos inline — padrão React Email ─────────────────────────────────────
// Inline styles são obrigatórios em e-mail — clientes de e-mail ignoram CSS externo

const styles = {
  body: {
    backgroundColor: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "560px",
    margin: "40px auto",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden" as const,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  header: {
    backgroundColor: "#1e40af",
    padding: "24px 32px",
  },
  logo: {
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
  },
  content: {
    padding: "32px",
  },
  greeting: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "16px",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#475569",
    margin: "0 0 16px 0",
  },
  trialCard: {
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    padding: "20px 24px",
    margin: "24px 0",
    borderLeft: "4px solid #2563eb",
  },
  trialTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1e40af",
    margin: "0 0 8px 0",
  },
  trialText: {
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#3b82f6",
    margin: 0,
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "24px 0 12px 0",
  },
  listItem: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.6",
    margin: "0 0 6px 0",
    paddingLeft: "4px",
  },
  ctaSection: {
    textAlign: "center" as const,
    margin: "32px 0",
  },
  button: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    textDecoration: "none",
    borderRadius: "8px",
    padding: "14px 32px",
    display: "inline-block",
  },
  signature: {
    fontSize: "15px",
    color: "#0f172a",
    fontWeight: "600",
    margin: "24px 0 0 0",
  },
  hr: {
    borderColor: "#e2e8f0",
    margin: "0 32px",
  },
  footer: {
    padding: "20px 32px",
  },
  footerText: {
    fontSize: "12px",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: "0 0 4px 0",
  },
};