import { Injectable, Logger, NestMiddleware, UnauthorizedException } from "@nestjs/common";
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

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const BLOCKED_STATUSES = ["CANCELING", "CANCELED"];

@Injectable()
export class WorkspaceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WorkspaceMiddleware.name);
  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.originalUrl.split("?")[0]; // Remove query string antes de checar

    this.logger.debug(`path: ${path}`);

    const pathParts = path.split("/").filter(Boolean);
    const isHealth = path.startsWith("/api/v1/health");
    const isWebhook = path.startsWith("/api/v1/webhooks");
    const isCnpjLookup = path.startsWith("/api/v1/cnpj/") && path.endsWith("/lookup");
    // A rota "/api/v1/portal/:slug" (comprimento 4) é pública para customizar a tela de login.
    // Qualquer sub-rota posterior (comprimento > 4) requer autenticação do cliente.
    const isPublicPortal = path.startsWith("/api/v1/portal") && pathParts.length === 4;
    const isPublic = isHealth || isPublicPortal || isCnpjLookup || isWebhook;

    if (isPublic) {
      this.logger.debug(`PUBLIC — passando direto: ${path}`);
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
      
      
            const isAsaasSubscribeRoute = path === "/api/v1/asaas/subscribe";
      if (WRITE_METHODS.includes(req.method) && !isAsaasSubscribeRoute) {
        const subscription = await prisma.subscription.findUnique({
          where: { workspaceId: workspaceUser.workspaceId },
          select: { status: true },
        });
        if (subscription && BLOCKED_STATUSES.includes(subscription.status)) {
          throw new UnauthorizedException(
            "Sua assinatura foi cancelada. Reative o plano em Assinatura para voltar a criar ou editar registros."
          );
        }
      }

      next();
    } catch (err) {
      this.logger.error(
        `Falha na autenticação em ${path}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      // Se já é um erro intencional nosso (ex: bloqueio por assinatura
      // cancelada), preserva a mensagem original em vez de sobrescrever.
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException("Token inválido ou expirado");
    }
  }
}
