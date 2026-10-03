import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export const metadata: Metadata = { metadataBase: new URL(APP_URL), title: "ContaHub", description: "Gestão para escritórios de contabilidade" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // @ts-expect-error — mismatch estrutural entre @clerk/localizations@4.21.2 e
    // @clerk/nextjs@^5.0.0 (versões divergentes de @clerk/types); objeto `ptBR`
    // funciona normalmente em runtime, é só diferença de tipagem entre pacotes
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}