/**
 * Template: Alerta de Prazo Fiscal
 * Enviado quando uma obrigação vence em 1, 3 ou 7 dias
 */
import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Tailwind } from "@react-email/tailwind";
import { Text } from "@react-email/text";
import * as React from "react";
import type { DeadlineAlertPayload } from "@contahub/shared";

interface DeadlineAlertEmailProps {
  recipientName: string;
  payload: DeadlineAlertPayload;
}

function urgencyColor(days: number): string {
  if (days === 1) return "#DC2626"; // vermelho — urgente
  if (days === 3) return "#D97706"; // laranja — atenção
  return "#2563EB";                 // azul — informativo
}

function urgencyLabel(days: number): string {
  if (days === 1) return "VENCE AMANHÃ";
  if (days === 3) return "Vence em 3 dias";
  return "Lembrete: 7 dias";
}

export default function DeadlineAlertEmail({
  recipientName,
  payload,
}: DeadlineAlertEmailProps) {
  const color = urgencyColor(payload.daysUntil);

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        {urgencyLabel(payload.daysUntil)} — {payload.obligationType} de{" "}
        {payload.clientName} vence em {payload.dueDate}
      </Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-8 max-w-xl">
            <Section
              className="rounded-t-xl px-8 py-6"
              style={{ backgroundColor: color }}
            >
              <Text className="m-0 text-xl font-bold text-white">ContaHub</Text>
              <Text className="m-0 text-sm text-white opacity-80">
                Sistema de Gestão Contábil
              </Text>
            </Section>

            <Section className="rounded-b-xl bg-white px-8 py-6 shadow-sm">
              <Heading className="text-xl font-bold text-gray-800">
                {urgencyLabel(payload.daysUntil)}
              </Heading>

              <Text className="text-gray-600">
                Olá, <strong>{recipientName}</strong>!
              </Text>

              <Text className="text-gray-600">
                Segue um lembrete sobre uma obrigação fiscal com prazo próximo:
              </Text>

              <Section
                className="my-4 rounded-lg border-l-4 px-5 py-4"
                style={{ borderLeftColor: color, backgroundColor: "#F9FAFB" }}
              >
                <Text className="m-0 text-sm text-gray-500">Obrigação</Text>
                <Text className="m-0 text-lg font-bold text-gray-800">
                  {payload.obligationType}
                </Text>
                <Hr className="my-3 border-gray-200" />
                <Text className="m-0 text-sm text-gray-500">Empresa</Text>
                <Text className="m-0 font-medium text-gray-700">
                  {payload.clientName}
                </Text>
                <Hr className="my-3 border-gray-200" />
                <Text className="m-0 text-sm text-gray-500">Vencimento</Text>
                <Text className="m-0 text-lg font-bold" style={{ color }}>
                  {payload.dueDate}
                </Text>
              </Section>

              {payload.portalUrl ? (
                <Section className="text-center">
                  <Button
                    href={payload.portalUrl}
                    className="rounded-lg px-6 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    Acessar Portal do Cliente
                  </Button>
                </Section>
              ) : null}

              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">
                Enviado automaticamente pelo{" "}
                <strong>{payload.workspaceName}</strong> via ContaHub.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

DeadlineAlertEmail.PreviewProps = {
  recipientName: "Sra. Maria",
  payload: {
    obligationType: "DAS",
    clientName: "Padaria São João Ltda",
    dueDate: "30/05/2026",
    daysUntil: 3,
    workspaceName: "Escritório Contábil Demo",
    portalUrl: "http://localhost:3010/portal/demo-escritorio",
  },
} satisfies DeadlineAlertEmailProps;
