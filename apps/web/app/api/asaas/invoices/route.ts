// apps/web/app/api/asaas/invoices/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
// Evita que o proxy fique pendurado indefinidamente se o backend
// (Render free tier) estiver em cold start ou fora do ar
const FETCH_TIMEOUT_MS = 15000;

export async function GET() {
  const { getToken } = auth();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await fetch(`${API_URL}/api/v1/asaas/invoices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    // Timeout ou backend indisponível — nunca deixa a requisição pendurada
    return NextResponse.json(
      { data: [], error: "Não foi possível carregar as faturas." },
      { status: 504 },
    );
  }
}
