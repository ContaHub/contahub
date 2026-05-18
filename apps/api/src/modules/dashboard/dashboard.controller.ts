import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Retorna todos os números do dashboard em uma única chamada
  // Evita múltiplos requests do frontend
  @Get("stats")
  async getStats(@Req() req: Request) {
    return this.dashboardService.getStats(req.workspaceId);
  }
}
