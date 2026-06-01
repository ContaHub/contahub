const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token");
  const data = await res.json();
  return data.token;
}

export interface CertificateStatus {
  id: string;
  expiresAt: string;
  status: "ACTIVE" | "EXPIRED" | "INVALID" | "REVOKED";
  daysUntilExpiry: number;
  expiringSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Busca o status do certificado de um cliente.
 * Retorna null se não houver certificado cadastrado.
 */
export async function getCertificateStatus(
  clientId: string
): Promise<CertificateStatus | null> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/certificates/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json();
  return json.data ?? null;
}

/**
 * Faz upload do certificado .pfx para o cliente.
 * Envia como multipart/form-data com o arquivo e a senha.
 */
export async function uploadCertificate(
  clientId: string,
  file: File,
  password: string
): Promise<{ message: string }> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);

  const res = await fetch(
    `${API_URL}/api/v1/certificates/${clientId}/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Erro ao enviar certificado");
  return json;
}

/**
 * Remove o certificado de um cliente.
 */
export async function deleteCertificate(clientId: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/certificates/${clientId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ message: "Erro ao remover" }));
    throw new Error(json.message);
  }
}
