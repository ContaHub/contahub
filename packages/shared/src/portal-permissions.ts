import { z } from "zod";

// Fonte única das permissões do portal — usada pela API (checagem) e pelo web (UI).
export const PORTAL_PERMISSIONS = [
  "VIEW_DOCUMENTS",
  "UPLOAD_DOCUMENTS",
  "DELETE_OWN_DOCUMENTS",
  "VIEW_OBLIGATIONS",
  "SUBMIT_COMPROVANTE",
  "REVIEW_REPORTS",
] as const;

export type PortalPermission = (typeof PORTAL_PERMISSIONS)[number];

// Zod valida o que chega do body: impede gravar uma permissão que não existe.
export const portalPermissionsSchema = z.array(z.enum(PORTAL_PERMISSIONS));

export const PORTAL_PERMISSION_LABELS: Record<PortalPermission, string> = {
  VIEW_DOCUMENTS: "Ver e baixar documentos",
  UPLOAD_DOCUMENTS: "Enviar documentos",
  DELETE_OWN_DOCUMENTS: "Remover documentos que ele enviou",
  VIEW_OBLIGATIONS: "Ver obrigações fiscais",
  SUBMIT_COMPROVANTE: "Enviar comprovante de pagamento",
  REVIEW_REPORTS: "Aprovar ou pedir revisão de relatórios",
};

export type PortalPresetKey = "READ_ONLY" | "STANDARD" | "FULL";

export const PORTAL_PRESETS: Record<
  PortalPresetKey,
  { label: string; description: string; permissions: readonly PortalPermission[] }
> = {
  READ_ONLY: {
    label: "Somente leitura",
    description: "Só consulta documentos e obrigações.",
    permissions: ["VIEW_DOCUMENTS", "VIEW_OBLIGATIONS"],
  },
  STANDARD: {
    label: "Padrão",
    description: "Consulta, envia comprovantes e documentos e revisa relatórios.",
    permissions: [
      "VIEW_DOCUMENTS",
      "VIEW_OBLIGATIONS",
      "UPLOAD_DOCUMENTS",
      "SUBMIT_COMPROVANTE",
      "REVIEW_REPORTS",
    ],
  },
  FULL: {
    label: "Completo",
    description: "Tudo do Padrão, mais remover os próprios envios.",
    permissions: [...PORTAL_PERMISSIONS],
  },
};