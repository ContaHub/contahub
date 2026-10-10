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

    return {
      data: { client, communications: data },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}