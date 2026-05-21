import { Controller, Get, Param, Query } from "@nestjs/common";
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
}