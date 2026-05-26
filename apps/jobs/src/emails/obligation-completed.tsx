/**
 * Template: Obrigação Concluída
 * Enviado ao cliente quando o contador marca uma obrigação como concluída
 */
import { Body } from "@react-email/body";
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
import type { ObligationCompletedPayload } from "@contahub/shared";

interface ObligationCompletedEmailProps {
  recipientName: string;
  payload: ObligationCompletedPayload;
}

export default function ObligationCompletedEmail({
  recipientName,
  payload,
}: ObligationCompletedEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        {payload.obligationType} de {payload.clientName} foi concluída
      </Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-8 max-w-xl">
            <Section className="rounded-t-xl bg-emerald-600 px-8 py-6">
              <Text className="m-0 text-xl font-bold text-white">ContaHub</Text>
              <Text className="m-0 text-sm text-white opacity-80">
                Sistema de Gestão Contábil
              </Text>
            </Section>

            <Section className="rounded-b-xl bg-white px-8 py-6 shadow-sm">
              <Heading className="text-xl font-bold text-gray-800">
                Obrigação Concluída
              </Heading>

              <Text className="text-gray-600">
                Olá, <strong>{recipientName}</strong>!
              </Text>

              <Text className="text-gray-600">
                A seguinte obrigação fiscal foi processada com sucesso:
              </Text>

              <Section className="my-4 rounded-lg bg-emerald-50 px-5 py-4">
                <Text className="m-0 text-sm text-gray-500">Obrigação</Text>
                <Text className="m-0 text-lg font-bold text-gray-800">
                  {payload.obligationType}
                </Text>
                <Hr className="my-3 border-emerald-200" />
                <Text className="m-0 text-sm text-gray-500">Empresa</Text>
                <Text className="m-0 font-medium text-gray-700">
                  {payload.clientName}
                </Text>
                <Hr className="my-3 border-emerald-200" />
                <Text className="m-0 text-sm text-gray-500">Concluída em</Text>
                <Text className="m-0 font-bold text-emerald-700">
                  {payload.completedAt}
                </Text>
                <Hr className="my-3 border-emerald-200" />
                <Text className="m-0 text-sm text-gray-500">Responsável</Text>
                <Text className="m-0 font-medium text-gray-700">
                  {payload.accountantName}
                </Text>
              </Section>

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

ObligationCompletedEmail.PreviewProps = {
  recipientName: "Sr. João",
  payload: {
    obligationType: "DARF",
    clientName: "Tech Solutions ME",
    completedAt: "24/05/2026 às 14h30",
    workspaceName: "Escritório Contábil Demo",
    accountantName: "William",
  },
} satisfies ObligationCompletedEmailProps;
