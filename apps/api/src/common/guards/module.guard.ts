import { CanActivate, ExecutionContext, Injectable, ForbiddenException, mixin } from "@nestjs/common";
import { ModuleKey, prisma } from "@contahub/database";
export function ModuleGuard(requiredModule: ModuleKey) {
  @Injectable()
  class ModuleGuardMixin implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const { workspaceId } = context.switchToHttp().getRequest();
      if (!workspaceId) throw new ForbiddenException("Workspace não identificado");
      const mod = await prisma.workspaceModule.findUnique({ where: { workspaceId_moduleKey: { workspaceId, moduleKey: requiredModule } } });
      if (!mod?.isEnabled) throw new ForbiddenException(`Módulo ${requiredModule} não habilitado`);
      return true;
    }
  }
  return mixin(ModuleGuardMixin);
}
