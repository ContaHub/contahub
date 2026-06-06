export function getClientDisplayName(client: {
  tradeName?: string | null;
  companyName?: string | null;
  name?: string | null;
}): string {
  return client.tradeName || client.companyName || client.name || "Cliente";
}