import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkspaceMiddleware } from "./common/middleware/workspace.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { FiscalModule } from "./modules/fiscal/fiscal.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { PortalModule } from "./modules/portal/portal.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ClientsModule,
    FiscalModule,
    DashboardModule,
    NotificationsModule,
    DocumentsModule,
    PortalModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware aplicado em todas as rotas
    // A verificação de rotas públicas é feita dentro do próprio middleware
    consumer.apply(WorkspaceMiddleware).forRoutes("*");
  }
}
