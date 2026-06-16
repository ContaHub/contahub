const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface CnpjStatusResult {
  cnpj:        string;
  status:      string;
  razaoSocial: string;
  situacao:    string;
  consultedAt: string;
  hasAlert:    boolean;
}

export const CNPJ_ALERT_STATUSES = ['INAPTA', 'BAIXADA', 'SUSPENSA', 'NULA'];

export function getCnpjAlertConfig(status: string | null | undefined) {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === 'INAPTA')  return { label: 'CNPJ Inapto',   class: 'bg-red-100 text-red-700',      icon: '🚨' };
  if (s === 'BAIXADA') return { label: 'CNPJ Baixado',  class: 'bg-gray-100 text-gray-700',    icon: '⛔' };
  if (s === 'SUSPENSA') return { label: 'CNPJ Suspenso', class: 'bg-orange-100 text-orange-700', icon: '⚠️' };
  if (s === 'NULA')    return { label: 'CNPJ Nulo',     class: 'bg-red-100 text-red-700',      icon: '❌' };
  return null; // ATIVA — sem alerta
}

export async function consultarCnpjStatus(
  cnpj: string,
  clientId: string,
  token: string,
): Promise<CnpjStatusResult> {
  const cnpjLimpo = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const res = await fetch(
    `${API_URL}/api/v1/cnpj/${cnpjLimpo}/status?clientId=${clientId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('Erro ao consultar CNPJ');
  const json = await res.json();
  return json.data;
}

export async function getHistoricoCnpj(clientId: string, token: string) {
  const res = await fetch(
    `${API_URL}/api/v1/cnpj/${clientId}/historico`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('Erro ao buscar histórico');
  const json = await res.json();
  return json.data;
}