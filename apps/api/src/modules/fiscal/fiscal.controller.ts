import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { ModuleGuard } from "../../common/guards/module.guard";
import { ModuleKey } from "@contahub/database";
import { FiscalService } from "./fiscal.service";
import { CreateObligationDto } from "./dto/create-obligation.dto";

@Controller("fiscal/obligations")
@UseGuards(ModuleGuard(ModuleKey.FISCAL))
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get()
  list(@Req() req: Request, @Query("clientId") c?: string, @Query("status") s?: string, @Query("month") m?: string, @Query("year") y?: string) {
    return this.fiscalService.findAll(req.workspaceId, { clientId: c, status: s, month: m ? +m : undefined, year: y ? +y : undefined });
  }

  @Get("upcoming")
  upcoming(@Req() req: Request, @Query("days") days = "7") {
    return this.fiscalService.findUpcoming(req.workspaceId, +days);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateObligationDto) {
    return this.fiscalService.create(req.workspaceId, dto);
  }

  @Put(":id")
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: Partial<CreateObligationDto>) {
    return this.fiscalService.update(req.workspaceId, id, dto);
  }

  @Put(":id/complete")
  complete(@Req() req: Request, @Param("id") id: string) {
    return this.fiscalService.markCompleted(req.workspaceId, id);
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.fiscalService.remove(req.workspaceId, id);
  }
}