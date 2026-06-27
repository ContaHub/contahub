import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@contahub/database";

const prisma = new PrismaClient();

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  async getSettings(workspaceId: string) {
    /**
     * $queryRaw — workaround para ts-node não reconhecer campos novos
     * após prisma generate em monorepo pnpm.
     * Solução permanente futura: migrar para @swc/core ou esbuild.
     */
    const rows = await prisma.$queryRaw<
      { notificationChannels: string[]; trialEndsAt: Date | null; name: string }[]
    >`
      SELECT "notificationChannels", "trialEndsAt", "name"
      FROM "public"."Workspace"
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    const ws = rows[0] ?? null;

    const result = {
      notificationChannels: ws?.notificationChannels ?? ["WHATSAPP"],
      trialEndsAt: ws?.trialEndsAt ? ws.trialEndsAt.toISOString() : null,
      // needsOnboarding: true se o nome ainda tem o prefixo gerado pelo webhook
      needsOnboarding: ws?.name?.startsWith("Escritório de ") ?? false,
    };

    this.logger.log(
      `getSettings workspaceId=${workspaceId} | trialEndsAt=${result.trialEndsAt ?? "null"} | needsOnboarding=${result.needsOnboarding} | channels=${result.notificationChannels.join(",")}`
    );

    return result;
  }

  async updateSettings(workspaceId: string, notificationChannels: string[]) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { notificationChannels },
    });
    return { notificationChannels };
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  // Chamado uma única vez após o primeiro login do contador.
  // Atualiza o nome do workspace (e opcionalmente o CNPJ).

  async completeOnboarding(
    workspaceId: string,
    dto: { name: string; cnpj?: string }
  ) {
    if (!dto.name?.trim()) {
      throw new BadRequestException("Nome do escritório é obrigatório.");
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name.trim(),
        ...(dto.cnpj ? { cnpj: dto.cnpj } : {}),
      } as any, // ts-node workaround — cnpj pode não ser reconhecido
    });

    this.logger.log(
      `Onboarding concluído — workspaceId=${workspaceId} | name="${dto.name.trim()}"`
    );

    return { name: dto.name.trim() };
  }
}