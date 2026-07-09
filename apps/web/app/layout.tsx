import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export const metadata: Metadata = { metadataBase: new URL(APP_URL), title: "ContaHub", description: "Gestão para escritórios de contabilidade" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html lang="pt-BR"><body>{children}</body></html></ClerkProvider>;
}
