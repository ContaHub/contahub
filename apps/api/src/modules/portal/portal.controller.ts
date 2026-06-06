import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, UploadedFile,
  UseInterceptors, Req, UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Request } from "express";
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
    @Query("email") email: string,
    @Req() req: Request
  ) {
    // Garante que o cliente autenticado só pode buscar informações do seu próprio e-mail
    if (email !== req.userEmail) {
      throw new UnauthorizedException("Você só pode buscar informações do seu próprio e-mail.");
    }
    return this.portalService.getClientByEmail(slug, email);
  }

 @Get(":slug/documents/:clientId")
async getDocuments(
  @Param("slug") slug: string,
  @Param("clientId") clientId: string,
  @Req() req: Request
) {
  await this.portalService.validateClientAccess(slug, clientId, req.userEmail!);
  return this.portalService.getClientDocuments(slug, clientId);
}

@Post(":slug/obligations/:obligationId/comprovante")
@UseInterceptors(
  FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  })
)
async submitComprovante(
  @Param("slug") slug: string,
  @Param("obligationId") obligationId: string,
  @Body("clientId") clientId: string,
  @UploadedFile() file: Express.Multer.File,
  @Req() req: Request,
) {
  return this.portalService.submitComprovante(slug, obligationId, clientId, file, req.userEmail!);
}

@Get(":slug/obligations/:clientId")
async getObligations(
  @Param("slug") slug: string,
  @Param("clientId") clientId: string,
  @Req() req: Request
) {
  await this.portalService.validateClientAccess(slug, clientId, req.userEmail!);
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
  @Req() req: Request,
  @Body("description") description?: string
) {
  await this.portalService.validateClientAccess(slug, clientId, req.userEmail!);
  return this.portalService.clientUpload(slug, clientId, file, description);
}

  @Get(":slug/documents/:documentId/download")
  async getDownloadUrl(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Req() req: Request
  ) {
    return this.portalService.getClientDocumentDownloadUrl(slug, documentId, req.userEmail!);
  }

  @Delete(":slug/documents/:documentId")
  async deleteClientDocument(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Req() req: Request
  ) {
    return this.portalService.deleteClientDocument(slug, documentId, req.userEmail!);
  }

  @Get(":slug/reports/:clientId")
  async getPendingReports(
    @Param("slug") slug: string,
    @Param("clientId") clientId: string,
    @Req() req: Request
  ) {
    await this.portalService.validateClientAccess(slug, clientId, req.userEmail!);
    return this.portalService.getPendingReports(slug, clientId);
  }

  @Put(":slug/reports/:documentId/approve")
  async approveReport(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Body("clientId") clientId: string,
    @Req() req: Request
  ) {
    return this.portalService.reviewDocument(slug, documentId, clientId, "APPROVED", req.userEmail!, undefined);
  }

  @Put(":slug/reports/:documentId/request-revision")
  async requestRevision(
    @Param("slug") slug: string,
    @Param("documentId") documentId: string,
    @Body("clientId") clientId: string,
    @Body("notes") notes: string,
    @Req() req: Request
  ) {
    return this.portalService.reviewDocument(slug, documentId, clientId, "REVISION_REQUESTED", req.userEmail!, notes);
  }
}
