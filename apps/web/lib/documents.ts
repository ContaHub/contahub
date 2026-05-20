import { apiFetch } from "./api";

export interface Document {
  id: string;
  name: string;
  description?: string;
  status: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  createdAt: string;
  client: { id: string; name: string };
}

export async function getDocuments(clientId?: string): Promise<{ data: Document[] }> {
  const query = clientId ? `?clientId=${clientId}` : "";
  return apiFetch(`/documents${query}`);
}

export async function getDownloadUrl(id: string): Promise<{ data: { url: string } }> {
  return apiFetch(`/documents/${id}/download`);
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  return apiFetch(`/documents/${id}`, { method: "DELETE" });
}

// Upload via FormData — não usa apiFetch pois precisa de multipart
export async function uploadDocument(
  file: File,
  clientId: string,
  description?: string
): Promise<{ data: Document; message: string }> {
  const tokenRes = await fetch("/api/auth/token");
  const { token } = await tokenRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("clientId", clientId);
  if (description) formData.append("description", description);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
  const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      // NÃO setar Content-Type — o browser define automaticamente com o boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro no upload" }));
    throw new Error(error.message);
  }

  return res.json();
}

// Formata tamanho do arquivo
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Ícone por tipo MIME
export function getFileIcon(mimeType?: string): string {
  if (!mimeType) return "📄";
  if (mimeType === "application/pdf") return "📕";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("xml")) return "🗂️";
  return "📄";
}
