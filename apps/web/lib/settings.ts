const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token");
  const data = await res.json();
  return data.token as string;
}

export interface WorkspaceSettings {
  notificationChannels: string[];
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/workspace/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao buscar configurações");
  const data = await res.json();
  return data.data as WorkspaceSettings;
}

export async function updateNotificationChannels(channels: string[]): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/workspace/settings`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationChannels: channels }),
  });
  if (!res.ok) throw new Error("Falha ao salvar configurações");
}

export async function sendTestEmail(to: string, template: string): Promise<{ jobId: string }> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/jobs/test-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, template }),
  });
  if (!res.ok) throw new Error("Falha ao enviar e-mail de teste");
  const data = await res.json();
  return data.data as { jobId: string };
}
