const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface NfeDocument {
  id:               string;
  chaveAcesso:      string;
  numero:           string;
  serie:            string;
  dataEmissao:      string;
  cnpjEmitente:     string;
  nomeEmitente:     string;
  cnpjDestinatario: string;
  nomeDestinatario: string;
  valorTotal:       number;
  valorIcms?:       number | null;
  valorIss?:        number | null;
  naturezaOperacao: string;
  client?:          { id: string; name: string } | null;
}

export async function uploadNfeXml(
  file: File,
  token: string,
): Promise<{ data: NfeDocument; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/v1/nfe/upload`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message ?? 'Erro ao importar NF-e');
  }

  return json;
}

export async function getNfeDocuments(token: string): Promise<NfeDocument[]> {
  const res = await fetch(`${API_URL}/api/v1/nfe`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data ?? [];
}

export function formatValorNfe(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}