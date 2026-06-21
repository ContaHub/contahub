import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { prisma } from "@contahub/database";

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
      clerkUserId: string;
      userRole?: string;
      userEmail?: string;
    }
  }
}

@Injectable()
export class WorkspaceMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.originalUrl.split("?")[0]; // Remove query string antes de checar

    console.log(`[Middleware] path: ${path}`);

    const pathParts = path.split("/").filter(Boolean);
    const isHealth = path.startsWith("/api/v1/health");
    const isWebhook = path.startsWith("/api/v1/webhooks");
    const isCnpjLookup = path.startsWith("/api/v1/cnpj/") && path.endsWith("/lookup");
    // A rota "/api/v1/portal/:slug" (comprimento 4) é pública para customizar a tela de login.
    // Qualquer sub-rota posterior (comprimento > 4) requer autenticação do cliente.
    const isPublicPortal = path.startsWith("/api/v1/portal") && pathParts.length === 4;
    const isPublic = isHealth || isPublicPortal || isCnpjLookup || isWebhook;

    if (isPublic) {
      console.log(`[Middleware] PUBLIC — passando direto`);
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticação não fornecido");
    }

    const token = authHeader.split(" ")[1];
    try {
      const payload = await clerkClient.verifyToken(token);
      const clerkUserId = payload.sub;

      const isPortalRoute = path.startsWith("/api/v1/portal");
      if (isPortalRoute) {
        // Busca os dados do usuário no Clerk para obter o e-mail cadastrado
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress;

        if (!email) {
          throw new UnauthorizedException("E-mail do usuário Clerk não encontrado");
        }

        req.userEmail = email;
        req.clerkUserId = clerkUserId;
        return next();
      }

      const workspaceUser = await prisma.workspaceUser.findFirst({
        where: { clerkUserId, isActive: true },
        select: { workspaceId: true, role: true },
      });

      if (!workspaceUser) {
        throw new UnauthorizedException("Usuário não pertence a nenhum workspace ativo");
      }

      req.clerkUserId = clerkUserId;
      req.workspaceId = workspaceUser.workspaceId;
      req.userRole = workspaceUser.role;

      next();
    } catch (err) {
      console.error("[Middleware] Falha na autenticação:", err);
      throw new UnauthorizedException("Token inválido ou expirado");
    }
  }
}
