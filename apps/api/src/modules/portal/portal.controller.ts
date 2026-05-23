import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PortalService } from "./portal.service";

@Controller("portal")
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get(":slug")
  async getWorkspace(@Param("slug") slug: string) {
    return this.portalService.getWorkspaceBySlug(slug);
  }

  @Get(":slug/client-by-email")
  async getClientByEmail(
    @Param("slug") slug: string,
    @Query("email") email: string
  ) {
    return this.portalService.getClientByEmail(slug, email);
  }

  @Get(":slug/documents/:clientId")
  async getDocuments(
    @Param("slug") slug: string,
    @Param("clientId") clientId: string
  ) {
    return this.portalService.getClientDocuments(slug, clientId);
  }

  @Get(":slug/obligations/:clientId")
  async getObligations(
    @Param("slug") slug: string,
    @Param("clientId") clientId: string
  ) {
    return this.portalService.getClientObligations(slug, clientId);
  }

  @Post(":slug/documents/:clientId/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async clientUpload(
    @Param("slug") slug: string,
    @Param("clientId") clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("description") description?: string
  ) {
    return this.portalService.clientUpload(slug, clientId, file, description);
  }

  // GET /api/v1/portal/:slug/documents/:documentId/download
@Get(":slug/documents/:documentId/download")
async getDownloadUrl(
  @Param("slug") slug: string,
  @Param("documentId") documentId: string
) {
  return this.portalService.getClientDocumentDownloadUrl(slug, documentId);
}

  // Remoção de documento enviado pelo cliente
  @Delete(":slug/documents/:documentId")
  async deleteClientDocument(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string
  ) {
    return this.portalService.deleteClientDocument(slug, documentId);
  }

  @Get(":slug/reports/:clientId")
  async getPendingReports(
    @Param("slug") slug: string,
    @Param("clientId") clientId: string
  ) {
    return this.portalService.getPendingReports(slug, clientId);
  }

  @Put(":slug/reports/:documentId/approve")
  async approveReport(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Body("clientId") clientId: string
  ) {
    return this.portalService.reviewDocument(slug, documentId, clientId, "APPROVED");
  }

  @Put(":slug/reports/:documentId/request-revision")
  async requestRevision(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Body("clientId") clientId: string,
    @Body("notes") notes: string
  ) {
    return this.portalService.reviewDocument(slug, documentId, clientId, "REJECTED", notes);
  }
}
