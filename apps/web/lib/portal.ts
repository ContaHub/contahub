const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface WorkspacePublic {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface PortalDocument {
  id: string;
  name: string;
  description?: string;
  status: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface PortalObligation {
  id: string;
  type: string;
  status: string;
  competenceMonth: number;
  competenceYear: number;
  dueDate: string;
  completedAt?: string;
  amount?: number;
}

// Busca info pública do escritório pelo slug
export async function getWorkspaceBySlug(slug: string): Promise<{ data: WorkspacePublic }> {
  const res = await fetch(`${API_URL}/api/v1/portal/${slug}`);
  if (!res.ok) throw new Error("Escritório não encontrado");
  return res.json();
}

// Busca documentos do cliente no portal
export async function getPortalDocuments(slug: string, clientId: string): Promise<{ data: PortalDocument[] }> {
  const res = await fetch(`${API_URL}/api/v1/portal/${slug}/documents/${clientId}`);
  if (!res.ok) throw new Error("Erro ao buscar documentos");
  return res.json();
}

// Busca obrigações do cliente no portal
export async function getPortalObligations(slug: string, clientId: string): Promise<{ data: PortalObligation[] }> {
  const res = await fetch(`${API_URL}/api/v1/portal/${slug}/obligations/${clientId}`);
  if (!res.ok) throw new Error("Erro ao buscar obrigações");
  return res.json();
}

// Busca URL de download de documento
export async function getPortalDownloadUrl(documentId: string, token: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/documents/${documentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erro ao gerar link de download");
  const data = await res.json();
  return data.data.url;
}

// Labels PT-BR para tipos de obrigação
export const OBLIGATION_LABELS: Record<string, string> = {
  DARF: "DARF", DAS: "DAS (Simples Nacional)", DEFIS: "DEFIS",
  SPED_CONTABIL: "SPED Contábil", SPED_FISCAL: "SPED Fiscal",
  REINF: "EFD-Reinf", ESOCIAL: "eSocial", DIRF: "DIRF",
  RAIS: "RAIS", GIA: "GIA", PGDAS: "PGDAS-D", OUTRO: "Outro",
};

// Status das obrigações em PT-BR
export const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  PENDING: { label: "Pendente", class: "bg-yellow-100 text-yellow-700" },
  IN_PROGRESS: { label: "Em andamento", class: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Concluída", class: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Atrasada", class: "bg-red-100 text-red-700" },
};

// Formata tamanho de arquivo
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Meses em PT-BR
export const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
