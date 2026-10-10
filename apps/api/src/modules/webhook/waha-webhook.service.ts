import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { WahaService } from "../../common/services/waha.service";

// Formato mínimo do evento "message" do WAHA que nos interessa
export interface WahaMessageEvent {
  event?: string;
  payload?: {
    id?: string;
    from?: string;
    fromMe?: boolean;
    body?: string;
    timestamp?: number;
  };
}

@Injectable()
export class WahaWebhookService {
  private readonly logger = new Logger(WahaWebhookService.name);

  constructor(private readonly waha: WahaService) {}

  async handleIncoming(event: WahaMessageEvent): Promise<void> {
    const msg = event.payload;
    if (event.event !== "message" || !msg?.from || msg.fromMe) return;

    // Grupos e status não são conversa com cliente
    if (msg.from.endsWith("@g.us") || msg.from === "status@broadcast") return;

    // 1. Descobre o telefone real. Por quê: o WhatsApp pode mandar um LID
    //    anônimo (...@lid) no lugar do número.
    const phoneDigits = msg.from.endsWith("@lid")
      ? await this.waha.resolveLid(msg.from)
      : msg.from.replace(/\D/g, "");

    if (!phoneDigits) {
      this.logger.warn("Mensagem ignorada: não foi possível resolver o número do remetente");
      return;
    }

    // 2. Chave de comparação: DDD + últimos 8 dígitos.
    //    Por quê: o cadastro guarda "11999990000" (sem 55) e o WhatsApp manda
    //    "5511999990000"; o 9º dígito também varia entre números antigos e novos.
    const national =
      phoneDigits.length >= 12 && phoneDigits.startsWith("55")
        ? phoneDigits.slice(2)
        : phoneDigits;
    if (national.length < 10) {
      this.logger.warn("Mensagem ignorada: telefone com tamanho inválido");
      return;
    }
    const ddd = national.slice(0, 2);
    const last8 = national.slice(-8);

    // 3. Busca clientes ativos com esse telefone, em qualquer workspace.
    //    O workspaceId sai do cliente encontrado, nunca da requisição.
    const matches = await prisma.$queryRaw<{ id: string; workspaceId: string }[]>`
      SELECT c."id", c."workspaceId"
      FROM "public"."Client" c
      WHERE c."status"::text = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM unnest(ARRAY[c."phone", c."whatsapp"]) AS p
          WHERE p IS NOT NULL
            AND left(regexp_replace(regexp_replace(p, '\\D', '', 'g'), '^55(\\d{10,11})$', '\\1'), 2) = ${ddd}
            AND right(regexp_replace(p, '\\D', '', 'g'), 8) = ${last8}
        )
    `;

    if (matches.length !== 1) {
      // 0 = remetente desconhecido; 2+ = mesmo telefone em escritórios/clientes
      // diferentes. Nos dois casos não adivinhamos o dono da conversa.
      this.logger.warn(
        `Mensagem não associada a cliente (${matches.length} correspondência(s))`,
      );
      return;
    }

    const { id: clientId, workspaceId } = matches[0];

    // 4. Deduplicação: o WAHA reenvia o webhook se a resposta demorar
    if (msg.id) {
      const existing = await prisma.communication.findFirst({
        where: { workspaceId, externalId: msg.id },
        select: { id: true },
      });
      if (existing) return;
    }

    // 5. Registra no histórico de comunicações do cliente
    const created = await prisma.communication.create({
      data: {
        workspaceId,
        clientId,
        channel: "WHATSAPP",
        direction: "inbound",
        content: msg.body?.trim() || "[mensagem sem texto]",
        externalId: msg.id,
        sentAt: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
      },
      select: { id: true },
    });

    this.logger.log(`Comunicação ${created.id} registrada para o cliente ${clientId}`);
  }
}