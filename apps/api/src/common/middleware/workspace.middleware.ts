import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { prisma } from "@contahub/database";
declare global { namespace Express { interface Request { workspaceId: string; clerkUserId: string; userRole: string; } } }
@Injectable()
export class WorkspaceMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedException("Token não fornecido");
    try {
      const payload = await clerkClient.verifyToken(authHeader.split(" ")[1]);
      const workspaceUser = await prisma.workspaceUser.findFirst({ where: { clerkUserId: payload.sub, isActive: true }, select: { workspaceId: true, role: true } });
      if (!workspaceUser) throw new UnauthorizedException("Usuário sem workspace ativo");
      req.clerkUserId = payload.sub; req.workspaceId = workspaceUser.workspaceId; req.userRole = workspaceUser.role;
      next();
    } catch { throw new UnauthorizedException("Token inválido"); }
  }
}
