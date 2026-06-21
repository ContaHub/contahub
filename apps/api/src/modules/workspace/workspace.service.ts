import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@contahub/database";

// Singleton do Prisma — padrão já adotado nos outros services do projeto
const prisma = new PrismaClient();

@Injectable()
export class WorkspaceService {
  async getSettings(workspaceId: string) {
    const ws = await prisma.$queryRaw<{ notificationChannels: string[]; trialEndsAt: Date | null }[]>`
      SELECT "notificationChannels", "trialEndsAt"
      FROM "public"."Workspace"
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    const data = ws[0];

    return {
      notificationChannels: data?.notificationChannels ?? ['WHATSAPP'],
      trialEndsAt: data?.trialEndsAt ?? null,
    };
  }

  async updateSettings(workspaceId: string, notificationChannels: string[]) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { notificationChannels },
    });
    return { notificationChannels };
  }
}
