import { Controller, Get, Patch, Post, Body, Req } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /** GET /api/v1/workspace/settings */
  @Get('settings')
  async getSettings(@Req() req: any) {
    return this.workspaceService.getSettings(req.workspaceId);
  }

  /** PATCH /api/v1/workspace/settings */
  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() body: { notificationChannels: string[] }) {
    return this.workspaceService.updateSettings(req.workspaceId, body.notificationChannels);
  }

  /** POST /api/v1/workspace/onboarding */
  @Post('onboarding')
  async completeOnboarding(@Req() req: any, @Body() body: { name: string; cnpj?: string }) {
    return this.workspaceService.completeOnboarding(req.workspaceId, body.name, body.cnpj);
  }

  /** GET /api/v1/workspace/plan — NOVO Sprint 1 */
  @Get('plan')
  async getPlan(@Req() req: any) {
    return this.workspaceService.getPlan(req.workspaceId);
  }
}