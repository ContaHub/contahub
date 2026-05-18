// Cliente HTTP centralizado para o ContaHub
// Busca o token do Clerk automaticamente e envia no header Authorization

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Busca o token do Clerk via endpoint interno do Next.js
  let token = "";
  try {
    const tokenRes = await fetch("/api/auth/token");
    if (tokenRes.ok) {
      const data = await tokenRes.json();
      token = data.token || "";
    }
  } catch {
    // Se não conseguir o token, tenta sem autenticação
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(error.message || `Erro ${res.status}`);
  }

  return res.json();
}
