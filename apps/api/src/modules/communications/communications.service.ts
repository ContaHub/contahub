import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@contahub/database";

@Injectable()
export class CommunicationsService {
  // Lista as comunicações de um cliente, da mais recente para a mais antiga.
  // Por quê o findFirst com workspaceId: garante que um escritório nunca
  // enxergue mensagens de cliente de outro (regra multi-tenant do projeto).
  async listByClient(workspaceId: string, clientId: string, page = 1, limit = 50) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
      select: { id: true, name: true, tradeName: true },
    });
    if (!client) throw new NotFoundException("Cliente não encontrado");

    const where = { workspaceId, clientId };
    const [data, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          channel: true,
          direction: true,
          subject: true,
          content: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.communication.count({ where }),
    ]);

    // Abrir a conversa marca as recebidas como lidas. Só na primeira página:
    // é ela que o contador vê ao abrir a tela, e paginar não deve alterar nada.
    if (page === 1) {
      await prisma.communication.updateMany({
        where: { workspaceId, clientId, direction: "inbound", readAt: null },
        data: { readAt: new Date() },
      });
    }

    return {
      data: { client, communications: data },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Quantidade de mensagens recebidas e não lidas, por cliente do workspace.
  // Por quê um groupBy só: a lista de clientes precisa da contagem de todos
  // de uma vez, e uma query por cliente seria N+1.
  async unreadCounts(workspaceId: string) {
    const rows = await prisma.communication.groupBy({
      by: ["clientId"],
      where: { workspaceId, direction: "inbound", readAt: null },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.clientId] = row._count._all;
    return { data: counts };
  }
}