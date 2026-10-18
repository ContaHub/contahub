import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Req, Body,
  UseInterceptors, UploadedFile, UseGuards, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { memoryStorage } from "multer";
import { ModuleGuard } from "../../common/guards/module.guard";
import { ModuleKey } from "@contahub/database";
import { DocumentsService } from "./documents.service";

@Controller("documents")
@UseGuards(ModuleGuard(ModuleKey.DOCUMENTS))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async list(@Req() req: Request, @Query("clientId") clientId?: string) {
    return this.documentsService.findAll(req.workspaceId, clientId);
  }

  @Get(":id/download")
  async getDownloadUrl(@Req() req: Request, @Param("id") id: string) {
    return this.documentsService.getDownloadUrl(req.workspaceId, id);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("clientId") clientId: string,
    @Body("description") description?: string,
    // Multipart só carrega texto: chega como "true"/"false". Ausente = visível (compatibilidade).
    @Body("visibleToClient") visibleToClient?: string,
  ) {
    return this.documentsService.upload(
      req.workspaceId, clientId, file, req.clerkUserId, description,
      visibleToClient !== "false",
    );
  }

  @Put(":id/review")
  async sendForReview(@Req() req: Request, @Param("id") id: string) {
    return this.documentsService.sendForReview(req.workspaceId, id);
  }

  @Put(":id/visibility")
  async setVisibility(
    @Req() req: Request,
    @Param("id") id: string,
    @Body("visible") visible: unknown,
  ) {
    // Sem confiar no corpo: só boolean de verdade passa
    if (typeof visible !== "boolean") {
      throw new BadRequestException("Informe 'visible' como true ou false.");
    }
    return this.documentsService.setVisibility(req.workspaceId, id, visible);
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    return this.documentsService.remove(req.workspaceId, id);
  }
}