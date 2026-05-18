import { Controller, Get, Post, Body, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { NotificationsService } from "./notifications.service";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

class SendTestDto {
  @IsString()
  phone!: string;
}

class SendAlertsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  daysAhead?: number;
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/v1/notifications/status — verifica se o WAHA está conectado
  @Get("status")
  async getStatus() {
    return this.notificationsService.getStatus();
  }

  // POST /api/v1/notifications/test — envia mensagem de teste
  @Post("test")
  async sendTest(@Req() req: Request, @Body() dto: SendTestDto) {
    return this.notificationsService.sendTestMessage(dto.phone, req.workspaceId);
  }

  // POST /api/v1/notifications/alerts — dispara alertas de prazo manualmente
  @Post("alerts")
  async sendAlerts(@Req() req: Request, @Body() dto: SendAlertsDto) {
    return this.notificationsService.sendDueSoonAlerts(
      req.workspaceId,
      dto.daysAhead || 3
    );
  }

  // POST /api/v1/notifications/complete/:id — notifica conclusão de obrigação
  @Post("complete/:id")
  async sendCompletion(@Req() req: Request, @Param("id") id: string) {
    return this.notificationsService.sendCompletionNotification(id, req.workspaceId);
  }
}
