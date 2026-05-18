import { apiFetch } from "./api";

export interface NotificationStatus {
  connected: boolean;
  session: string;
  message: string;
}

export interface AlertResult {
  sent: number;
  obligations: Array<{
    obligationId: string;
    recipient: string;
    phone: string;
    success: boolean;
  }>;
}

export async function getNotificationStatus(): Promise<{ data: NotificationStatus }> {
  return apiFetch("/notifications/status");
}

export async function sendTestMessage(phone: string): Promise<{ success: boolean; message: string }> {
  return apiFetch("/notifications/test", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function sendDueAlerts(daysAhead: number): Promise<{ sent: number; obligations: AlertResult["obligations"] }> {
  return apiFetch("/notifications/alerts", {
    method: "POST",
    body: JSON.stringify({ daysAhead }),
  });
}
