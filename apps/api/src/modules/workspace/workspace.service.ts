import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@contahub/database";

// Singleton do Prisma — padrão já adotado nos outros services do projeto
const prisma = new PrismaClient();

@Injectable()
export class WorkspaceService {
  async getSettings(workspaceId: string) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { notificationChannels: true },
    });
    return {
      notificationChannels: ws?.notificationChannels ?? ["WHATSAPP"],
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
