import { Controller, Get, Patch, Body, Req } from "@nestjs/common";
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
}
