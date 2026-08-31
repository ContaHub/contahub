import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './modules/jobs/jobs.module';
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
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { CnpjModule } from './modules/cnpj/cnpj.module';
import { NfeModule } from './modules/nfe/nfe.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { EcacModule } from './modules/ecac/ecac.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AsaasModule } from './modules/asaas/asaas.module';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
  tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null,
};

@Module({
  imports: [
    // Fase 3 — BullMQ
    BullModule.forRoot({
      connection: redisConnection,
    }),
    JobsModule,

    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ClientsModule,
    FiscalModule,
    DashboardModule,
    NotificationsModule,
    DocumentsModule,
    PortalModule,
    WorkspaceModule,
    CnpjModule,
    NfeModule,
    CertificatesModule,
    EcacModule,
    WebhookModule,
    AsaasModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware aplicado em todas as rotas
    // A verificação de rotas públicas é feita dentro do próprio middleware
    consumer.apply(WorkspaceMiddleware).forRoutes("*");
  }
}
