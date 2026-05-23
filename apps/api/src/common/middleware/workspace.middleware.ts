import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { prisma } from "@contahub/database";

declare global {
  namespace Express {
    interface Request {
      workspaceId: string;
      clerkUserId: string;
      userRole: string;
    }
  }
}

const PUBLIC_PREFIXES = ["/api/v1/health", "/api/v1/portal"];

@Injectable()
export class WorkspaceMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.originalUrl.split("?")[0]; // Remove query string antes de checar

    console.log(`[Middleware] path: ${path}`);

    const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
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
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado");
    }
  }
}
