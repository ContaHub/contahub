import { Controller, Get, Patch, Post, Body, Req } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";

interface AuthRequest extends Request {
  workspaceId: string;
}

@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get("settings")
  async getSettings(@Req() req: AuthRequest) {
    const data = await this.workspaceService.getSettings(req.workspaceId);
    return { data };
  }

  @Patch("settings")
  async updateSettings(
    @Req() req: AuthRequest,
    @Body() body: { notificationChannels: string[] }
  ) {
    const data = await this.workspaceService.updateSettings(
      req.workspaceId,
      body.notificationChannels
    );
    return { data, message: "Configurações atualizadas" };
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  // POST /api/v1/workspace/onboarding
  // Chamado pela tela /onboarding após o primeiro login do contador.

  @Post("onboarding")
  async completeOnboarding(
    @Req() req: AuthRequest,
    @Body() body: { name: string; cnpj?: string }
  ) {
    const data = await this.workspaceService.completeOnboarding(
      req.workspaceId,
      body
    );
    return { data, message: "Escritório configurado com sucesso!" };
  }
}