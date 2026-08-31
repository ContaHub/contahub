/**
 * Template: Boas-vindas ao Portal
 * Enviado quando o contador habilita o portal para um cliente
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
import type { PortalWelcomePayload } from "@contahub/shared";

const TailwindComp = Tailwind as any;

interface PortalWelcomeEmailProps {
  recipientName: string;
  payload: PortalWelcomePayload;
}

export default function PortalWelcomeEmail({
  recipientName,
  payload,
}: PortalWelcomeEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Seu acesso ao portal do {payload.workspaceName} foi criado
      </Preview>
      <TailwindComp>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-8 max-w-xl">
            <Section className="rounded-t-xl bg-blue-600 px-8 py-6">
              <Text className="m-0 text-xl font-bold text-white">ContaHub</Text>
              <Text className="m-0 text-sm text-white opacity-80">
                Portal do Cliente
              </Text>
            </Section>

            <Section className="rounded-b-xl bg-white px-8 py-6 shadow-sm">
              <Heading className="text-xl font-bold text-gray-800">
                Bem-vindo ao seu portal!
              </Heading>

              <Text className="text-gray-600">
                Olá, <strong>{recipientName}</strong>!
              </Text>

              <Text className="text-gray-600">
                Seu escritório de contabilidade,{" "}
                <strong>{payload.workspaceName}</strong>, criou um portal
                exclusivo para você acompanhar obrigações fiscais, documentos e
                relatórios contábeis em tempo real.
              </Text>

              <Section className="my-4 rounded-lg bg-blue-50 px-5 py-4">
                <Text className="m-0 font-semibold text-blue-800">
                  O que você pode fazer no portal:
                </Text>
                <Text className="m-0 mt-2 text-sm text-gray-700">
                  - Visualizar e baixar seus documentos contábeis
                </Text>
                <Text className="m-0 mt-1 text-sm text-gray-700">
                  - Acompanhar obrigações fiscais e prazos
                </Text>
                <Text className="m-0 mt-1 text-sm text-gray-700">
                  - Aprovar ou solicitar revisão de relatórios
                </Text>
                <Text className="m-0 mt-1 text-sm text-gray-700">
                  - Enviar documentos para seu contador
                </Text>
              </Section>

              {payload.temporaryPassword ? (
                <Section className="my-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
                  <Text className="m-0 text-sm font-semibold text-amber-800">
                    Seus dados de acesso:
                  </Text>
                  <Text className="m-0 mt-2 text-sm text-gray-700">
                    <strong>Senha provisória:</strong>{" "}
                    {payload.temporaryPassword}
                  </Text>
                  <Text className="m-0 mt-1 text-xs text-amber-700">
                    Recomendamos alterar sua senha no primeiro acesso.
                  </Text>
                </Section>
              ) : null}

              <Section className="my-6 text-center">
                <Button
                  href={payload.portalUrl}
                  className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white"
                >
                  Acessar Meu Portal
                </Button>
              </Section>

              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">
                Se você não solicitou este acesso, ignore este e-mail. Dúvidas?
                Entre em contato com <strong>{payload.workspaceName}</strong>.
              </Text>
            </Section>
          </Container>
        </Body>
      </TailwindComp>
    </Html>
  );
}

PortalWelcomeEmail.PreviewProps = {
  recipientName: "Maria Oliveira",
  payload: {
    workspaceName: "Escritório Contábil Demo",
    portalUrl: "http://localhost:3010/portal/demo-escritorio",
  },
} satisfies PortalWelcomeEmailProps;
