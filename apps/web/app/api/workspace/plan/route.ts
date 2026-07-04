// apps/web/app/api/workspace/plan/route.ts
// Proxy → GET /api/v1/workspace/plan (NestJS)
// Mantém padrão do projeto: frontend nunca chama NestJS diretamente em rotas de auth

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function GET() {
  const { getToken } = auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/v1/workspace/plan`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}