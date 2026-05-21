import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { prisma } from "@contahub/database";

@Injectable()
export class PortalService {

  async getWorkspaceBySlug(slug: string) {
    // ...
  }

  async getClientByEmail(workspaceSlug: string, email: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace)
      throw new NotFoundException("Escritório não encontrado");

    const client = await prisma.client.findFirst({
      where: {
        workspaceId: workspace.id,
        portalEmail: email,
        portalEnabled: true,
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        taxRegime: true,
      },
    });

    if (!client)
      throw new UnauthorizedException("Acesso não autorizado");

    return { data: client };
  }

  async getClientDocuments(workspaceSlug: string, clientId: string) {
    // ...
  }

  async getClientObligations(workspaceSlug: string, clientId: string) {
    // ...
  }
}