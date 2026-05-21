import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { ModuleGuard } from "../../common/guards/module.guard";
import { ModuleKey } from "@contahub/database";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto, ListClientsDto } from "./dto/update-client.dto";
@Controller("clients")
@UseGuards(ModuleGuard(ModuleKey.CRM))
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}
  @Get() list(@Req() req: Request, @Query() q: ListClientsDto) { return this.clientsService.findAll(req.workspaceId, q); }
  @Get(":id") findOne(@Req() req: Request, @Param("id") id: string) { return this.clientsService.findOne(req.workspaceId, id); }
  @Post() @HttpCode(HttpStatus.CREATED) create(@Req() req: Request, @Body() dto: CreateClientDto) { return this.clientsService.create(req.workspaceId, dto); }
  @Put(":id") update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateClientDto) { return this.clientsService.update(req.workspaceId, id, dto); }
  @Delete(":id") @HttpCode(HttpStatus.NO_CONTENT) remove(@Req() req: Request, @Param("id") id: string) { return this.clientsService.remove(req.workspaceId, id); }
}

// PATCH /api/v1/clients/:id/portal — habilita/desabilita portal do cliente
