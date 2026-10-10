import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { CommunicationsService } from "./communications.service";

// O WorkspaceMiddleware injeta workspaceId na requisição a partir do JWT do Clerk
interface WorkspaceRequest {
  workspaceId: string;
}

@Controller("communications")
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  /** GET /api/v1/communications/unread-counts → { data: { [clientId]: n } } */
  @Get("unread-counts")
  unreadCounts(@Req() req: WorkspaceRequest) {
    return this.communications.unreadCounts(req.workspaceId);
  }

  /** GET /api/v1/communications/client/:clientId?page=1 */
  @Get("client/:clientId")
  listByClient(
    @Param("clientId") clientId: string,
    @Query("page") page: string | undefined,
    @Req() req: WorkspaceRequest,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    return this.communications.listByClient(req.workspaceId, clientId, pageNumber);
  }
}