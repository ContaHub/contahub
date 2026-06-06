import { Injectable } from "@nestjs/common";
import { prisma } from "@contahub/database";

@Injectable()
export class DashboardService {
  async getStats(workspaceId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Roda todas as queries em paralelo para máxima performance
    const [
      activeClients,
      pendingObligations,
      dueTodayObligations,
      completedThisMonth,
      upcomingObligations,
    ] = await Promise.all([
      // Total de clientes ativos
      prisma.client.count({
        where: { workspaceId, status: "ACTIVE" },
      }),

      // Obrigações pendentes ou em andamento
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),

      // Vencendo hoje (inclui atrasadas do dia)
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { gte: todayStart, lt: todayEnd },
        },
      }),

      // Concluídas no mês atual
      prisma.fiscalObligation.count({
        where: {
          workspaceId,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lt: monthEnd },
        },
      }),

      // Próximas 5 obrigações para o widget de alertas
      prisma.fiscalObligation.findMany({
        where: {
          workspaceId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { gte: now },
        },
        include: {
          client: { select: { id: true, name: true, tradeName: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

    return {
      data: {
        activeClients,
        pendingObligations,
        dueTodayObligations,
        completedThisMonth,
        upcomingObligations,
      },
    };
  }
}
