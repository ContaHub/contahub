import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkspaceMiddleware } from "./common/middleware/workspace.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { FiscalModule } from "./modules/fiscal/fiscal.module";
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, ClientsModule, FiscalModule] })
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WorkspaceMiddleware).exclude({ path: "api/v1/health", method: RequestMethod.GET }).forRoutes("*");
  }
}
