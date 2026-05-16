import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
export const metadata: Metadata = { title: "ContaHub", description: "Gestão para escritórios de contabilidade" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html lang="pt-BR"><body>{children}</body></html></ClerkProvider>;
}
