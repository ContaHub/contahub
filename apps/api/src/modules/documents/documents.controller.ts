import {
  Controller, Get, Post, Delete,
  Param, Query, Req, Body,
  UseInterceptors, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator,
  UseGuards,
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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(), // Mantém em memória para enviar ao Supabase
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    })
  )
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("clientId") clientId: string,
    @Body("description") description?: string
  ) {
    return this.documentsService.upload(
      req.workspaceId,
      clientId,
      file,
      req.clerkUserId,
      description
    );
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    return this.documentsService.remove(req.workspaceId, id);
  }
}
