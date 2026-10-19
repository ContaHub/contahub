/**
 * PortalNoticesService — decide SE e PARA QUEM avisar por WhatsApp quando o escritório
 * disponibiliza algo no portal, e enfileira a mensagem.
 *
 * Regras:
 *  - só avisa se o cliente tem portal habilitado;
 *  - só se o canal WHATSAPP está ativo no workspace;
 *  - só se o cliente tem a permissão para abrir aquilo que está sendo avisado;
 *  - só se existe um número válido (whatsapp, com fallback para phone);
 *  - NUNCA lança erro: um aviso que falha não pode derrubar upload nem cadastro.
 */
import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@contahub/database";
import {
  DEFAULT_JOB_OPTIONS,
  normalizeWhatsappNumber,
  buildDocumentSharedWhatsapp,
  buildDocumentForReviewWhatsapp,
  buildObligationCreatedWhatsapp,
  buildObligationDueDateChangedWhatsapp,
  type PortalPermission,
} from "@contahub/shared";
import { JobsProducerService } from "./jobs-producer.service";

interface Recipient {
  name: string;
  phone: string;
  workspaceName: string;
  portalUrl: string;
}

const dateBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

@Injectable()
export class PortalNoticesService {
  private readonly logger = new Logger(PortalNoticesService.name);

  constructor(private readonly producer: JobsProducerService) {}

  // ── Documento disponibilizado (aba Documentos) ─────────────────────────────
  async notifyDocumentShared(p: {
    workspaceId: string;
    clientId: string;
    documentId: string;
    documentLabel?: string | null;
  }): Promise<void> {
    await this.safely(`documento ${p.documentId}`, async () => {
      const r = await this.resolveRecipient(p.workspaceId, p.clientId, "VIEW_DOCUMENTS");
      if (!r) return;
      await this.dispatch(
        r,
        buildDocumentSharedWhatsapp({
          recipientName: r.name,
          workspaceName: r.workspaceName,
          portalUrl: r.portalUrl,
          documentLabel: p.documentLabel,
        }),
        `notice-doc-${p.documentId}`,
      );
    });
  }

  // ── Documento aguardando aprovação (aba Documentos Para Aprovação) ─────────
  async notifyDocumentForReview(p: {
    workspaceId: string;
    clientId: string;
    documentId: string;
    documentLabel?: string | null;
  }): Promise<void> {
    await this.safely(`revisão ${p.documentId}`, async () => {
      const r = await this.resolveRecipient(p.workspaceId, p.clientId, "REVIEW_REPORTS");
      if (!r) return;
      await this.dispatch(
        r,
        buildDocumentForReviewWhatsapp({
          recipientName: r.name,
          workspaceName: r.workspaceName,
          portalUrl: r.portalUrl,
          documentLabel: p.documentLabel,
        }),
        `notice-review-${p.documentId}`,
      );
    });
  }

    // ── Vencimento de obrigação alterado (aba Obrigações) ──────────────────────
    async notifyObligationDueDateChanged(p: {
        workspaceId: string;
        clientId: string;
        obligationId: string;
        obligationType: string;
        competenceMonth: number;
        competenceYear: number;
        previousDueDate: Date;
        dueDate: Date;
    }): Promise<void> {
        await this.safely(`vencimento ${p.obligationId}`, async () => {
        const r = await this.resolveRecipient(p.workspaceId, p.clientId, "VIEW_OBLIGATIONS");
        if (!r) return;
        await this.dispatch(
            r,
            buildObligationDueDateChangedWhatsapp({
            recipientName: r.name,
            workspaceName: r.workspaceName,
            portalUrl: r.portalUrl,
            obligationType: p.obligationType,
            competence: `${String(p.competenceMonth).padStart(2, "0")}/${p.competenceYear}`,
            previousDueDate: dateBR.format(p.previousDueDate),
            dueDate: dateBR.format(p.dueDate),
            }),
            // Inclui o novo prazo: duas mudanças diferentes avisam, a mesma mudança repetida não
            `notice-obl-due-${p.obligationId}-${p.dueDate.toISOString().slice(0, 10)}`,
        );
        });
    }

  // ── Obrigação lançada (aba Obrigações) ─────────────────────────────────────
  async notifyObligationCreated(p: {
    workspaceId: string;
    clientId: string;
    obligationId: string;
    obligationType: string;
    competenceMonth: number;
    competenceYear: number;
    dueDate: Date;
  }): Promise<void> {
    await this.safely(`obrigação ${p.obligationId}`, async () => {
      const r = await this.resolveRecipient(p.workspaceId, p.clientId, "VIEW_OBLIGATIONS");
      if (!r) return;
      await this.dispatch(
        r,
        buildObligationCreatedWhatsapp({
          recipientName: r.name,
          workspaceName: r.workspaceName,
          portalUrl: r.portalUrl,
          obligationType: p.obligationType,
          competence: `${String(p.competenceMonth).padStart(2, "0")}/${p.competenceYear}`,
          // dueDate é salvo como meia-noite UTC: formatar em UTC evita o erro de um dia
          dueDate: dateBR.format(p.dueDate),
        }),
        `notice-obl-${p.obligationId}`,
      );
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private async resolveRecipient(
    workspaceId: string,
    clientId: string,
    required: PortalPermission,
  ): Promise<Recipient | null> {
    const [client, workspace] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, workspaceId, portalEnabled: true },
        select: { id: true, name: true, tradeName: true, phone: true, whatsapp: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, slug: true, notificationChannels: true },
      }),
    ]);
    if (!client || !workspace) return null;

    const channels: string[] = workspace.notificationChannels ?? ["WHATSAPP"];
    if (!channels.includes("WHATSAPP") && !channels.includes("BOTH")) return null;

    // $queryRaw tipado: o ts-node não reconhece campos novos do Prisma (workaround do projeto)
    const rows = await prisma.$queryRaw<{ portalPermissions: string[] }[]>`
      SELECT "portalPermissions"
      FROM "public"."Client"
      WHERE id = ${client.id}
      LIMIT 1
    `;
    if (!(rows[0]?.portalPermissions ?? []).includes(required)) return null;

    const phone =
      normalizeWhatsappNumber(client.whatsapp) ?? normalizeWhatsappNumber(client.phone);
    if (!phone) {
      this.logger.warn(`Aviso ignorado — cliente ${client.id} sem número de WhatsApp válido`);
      return null;
    }

    return {
      name: client.tradeName || client.name,
      phone,
      workspaceName: workspace.name,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/portal/${workspace.slug}`,
    };
  }

  // jobId fixo por evento: o BullMQ ignora duplicatas enquanto o job estiver retido
  // (24h, conforme DEFAULT_JOB_OPTIONS), evitando aviso repetido se a ação for refeita.
  private async dispatch(r: Recipient, message: string, jobId: string): Promise<void> {
    await this.producer.queueWhatsApp(
      { phone: r.phone, message },
      { ...DEFAULT_JOB_OPTIONS, jobId },
    );
  }

  private async safely(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(
        `Aviso por WhatsApp falhou (${label}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}