#!/bin/bash
set -e
echo "🚀 Criando estrutura do ContaHub..."

mkdir -p apps/web/app/\(dashboard\)/dashboard
mkdir -p apps/api/src/common/middleware
mkdir -p apps/api/src/common/guards
mkdir -p apps/api/src/modules/health
mkdir -p apps/api/src/modules/clients/dto
mkdir -p apps/api/src/modules/fiscal/dto
mkdir -p apps/jobs/src
mkdir -p packages/database/prisma
mkdir -p packages/database/src
mkdir -p packages/shared/src
mkdir -p packages/config
mkdir -p packages/ui/src
mkdir -p .github/workflows

cat > package.json << 'EOF'
{
  "name": "contahub",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:seed": "turbo db:seed",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9.0.0"
}
EOF

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "outputs": [] },
    "clean": { "cache": false },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false }
  }
}
EOF

cat > .gitignore << 'EOF'
node_modules
dist
build
.next
.turbo
.env
.env.local
*.log
.DS_Store
.vscode
*.db
coverage
github-recovery-codes.txt
*.skill
EOF

cat > .env.example << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/contahub?schema=public"
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="contahub-documents"
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="http://localhost:3010"
NEXT_PUBLIC_API_URL="http://localhost:3002"
NODE_ENV="development"
EOF

# packages/config
cat > packages/config/package.json << 'EOF'
{
  "name": "@contahub/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./tsconfig/base.json": "./tsconfig.base.json",
    "./tsconfig/nextjs.json": "./tsconfig.nextjs.json"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

cat > packages/config/tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022", "module": "commonjs", "strict": true,
    "esModuleInterop": true, "skipLibCheck": true,
    "resolveJsonModule": true, "declaration": true, "sourceMap": true
  },
  "exclude": ["node_modules"]
}
EOF

cat > packages/config/tsconfig.nextjs.json << 'EOF'
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017", "module": "esnext", "moduleResolution": "bundler",
    "lib": ["ES2017", "dom", "dom.iterable"], "jsx": "preserve",
    "plugins": [{ "name": "next" }], "paths": { "@/*": ["./*"] }
  }
}
EOF

# packages/database
cat > packages/database/package.json << 'EOF'
{
  "name": "@contahub/database",
  "version": "0.0.1",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "tsx src/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": { "@prisma/client": "^5.13.0" },
  "devDependencies": { "prisma": "^5.13.0", "tsx": "^4.7.0", "typescript": "^5.4.0" }
}
EOF

cat > packages/database/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
enum UserRole { OWNER ADMIN ACCOUNTANT ASSISTANT }
enum ModuleKey { CRM FISCAL DOCUMENTS COMMUNICATION CLIENT_PORTAL FINANCIAL BI AUTOMATION }
enum SubscriptionStatus { TRIAL ACTIVE PAST_DUE CANCELED SUSPENDED }
enum SubscriptionPlan { STARTER PRO ENTERPRISE }
enum ObligationType { DARF DAS DEFIS SPED_CONTABIL SPED_FISCAL SPED_CONTRIBUICOES ECFD DCTF REINF ESOCIAL DIRF RAIS GIA PGDAS OUTRO }
enum ObligationStatus { PENDING IN_PROGRESS COMPLETED OVERDUE CANCELED }
enum DocumentStatus { PENDING_UPLOAD UPLOADED UNDER_REVIEW APPROVED REJECTED }
enum CommunicationChannel { WHATSAPP EMAIL PORTAL PHONE }
enum ClientStatus { ACTIVE INACTIVE SUSPENDED }
enum TaxRegime { SIMPLES_NACIONAL LUCRO_PRESUMIDO LUCRO_REAL MEI ISENTO }

model Workspace {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  cnpj         String?  @unique
  clerkOrgId   String   @unique
  logoUrl      String?
  primaryColor String?  @default("#2563EB")
  timezone     String   @default("America/Sao_Paulo")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  users          WorkspaceUser[]
  clients        Client[]
  modules        WorkspaceModule[]
  subscription   Subscription?
  documents      Document[]
  obligations    FiscalObligation[]
  communications Communication[]
  invoices       Invoice[]
  @@index([slug])
}
model WorkspaceUser {
  id          String    @id @default(cuid())
  workspaceId String
  clerkUserId String
  role        UserRole  @default(ACCOUNTANT)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, clerkUserId])
  @@index([workspaceId])
  @@index([clerkUserId])
}
model Client {
  id            String       @id @default(cuid())
  workspaceId   String
  name          String
  tradeName     String?
  cnpj          String
  cpf           String?
  taxRegime     TaxRegime    @default(SIMPLES_NACIONAL)
  status        ClientStatus @default(ACTIVE)
  email         String?
  phone         String?
  whatsapp      String?
  zipCode       String?
  street        String?
  city          String?
  state         String?
  portalEnabled Boolean      @default(false)
  portalEmail   String?
  notes         String?
  tags          String[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  workspace      Workspace          @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  obligations    FiscalObligation[]
  documents      Document[]
  communications Communication[]
  @@unique([workspaceId, cnpj])
  @@index([workspaceId])
  @@index([workspaceId, status])
}
model FiscalObligation {
  id              String           @id @default(cuid())
  workspaceId     String
  clientId        String
  type            ObligationType
  status          ObligationStatus @default(PENDING)
  competenceMonth Int
  competenceYear  Int
  dueDate         DateTime
  completedAt     DateTime?
  amount          Int?
  fineAmount      Int?
  assignedTo      String?
  notes           String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  client    Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
  @@index([workspaceId, clientId])
  @@index([workspaceId, status])
  @@index([workspaceId, dueDate])
}
model Document {
  id          String         @id @default(cuid())
  workspaceId String
  clientId    String
  name        String
  description String?
  status      DocumentStatus @default(PENDING_UPLOAD)
  storageKey  String?
  storageUrl  String?
  mimeType    String?
  sizeBytes   Int?
  version     Int            @default(1)
  parentId    String?
  reviewedBy  String?
  reviewedAt  DateTime?
  reviewNotes String?
  createdBy   String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  client    Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
  @@index([workspaceId, clientId])
}
model Communication {
  id          String               @id @default(cuid())
  workspaceId String
  clientId    String
  channel     CommunicationChannel
  direction   String
  subject     String?
  content     String
  externalId  String?
  sentAt      DateTime?
  readAt      DateTime?
  sentBy      String?
  createdAt   DateTime             @default(now())
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  client    Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
  @@index([workspaceId, clientId])
}
model WorkspaceModule {
  id          String    @id @default(cuid())
  workspaceId String
  moduleKey   ModuleKey
  isEnabled   Boolean   @default(true)
  enabledAt   DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, moduleKey])
  @@index([workspaceId])
}
model Subscription {
  id                  String             @id @default(cuid())
  workspaceId         String             @unique
  plan                SubscriptionPlan   @default(STARTER)
  status              SubscriptionStatus @default(TRIAL)
  asaasCustomerId     String?
  asaasSubscriptionId String?
  trialEndsAt         DateTime?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  canceledAt          DateTime?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  invoices  Invoice[]
}
model Invoice {
  id             String    @id @default(cuid())
  workspaceId    String
  subscriptionId String
  asaasPaymentId String?   @unique
  amount         Int
  status         String
  dueDate        DateTime
  paidAt         DateTime?
  paymentMethod  String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  workspace    Workspace    @relation(fields: [workspaceId], references: [id])
  subscription Subscription @relation(fields: [subscriptionId], references: [id])
  @@index([workspaceId])
}
EOF

cat > packages/database/src/index.ts << 'EOF'
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export * from "@prisma/client";
EOF

# packages/shared
cat > packages/shared/package.json << 'EOF'
{
  "name": "@contahub/shared",
  "version": "0.0.1",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.4.0" }
}
EOF

cat > packages/shared/src/index.ts << 'EOF'
import { z } from "zod";
export interface ApiResponse<T> { data: T; message?: string; }
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; limit: number; total: number; totalPages: number; };
}
export const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido");
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
export const OBLIGATION_LABELS: Record<string, string> = {
  DARF: "DARF", DAS: "DAS (Simples Nacional)", SPED_FISCAL: "SPED Fiscal",
  ESOCIAL: "eSocial", DIRF: "DIRF", RAIS: "RAIS", OUTRO: "Outro",
};
EOF

# packages/ui
cat > packages/ui/package.json << 'EOF'
{ "name": "@contahub/ui", "version": "0.0.1", "private": true, "exports": { ".": "./src/index.ts" }, "devDependencies": { "typescript": "^5.4.0" } }
EOF
cat > packages/ui/src/index.ts << 'EOF'
// Componentes do design system — implementar na Fase 2
export {};
EOF

# apps/api
cat > apps/api/package.json << 'EOF'
{
  "name": "@contahub/api",
  "version": "0.0.1",
  "private": true,
  "scripts": { "build": "nest build", "dev": "nest start --watch", "start": "node dist/main", "lint": "eslint \"{src}/**/*.ts\"" },
  "dependencies": {
    "@clerk/clerk-sdk-node": "^5.0.0",
    "@contahub/database": "workspace:*",
    "@contahub/shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/mapped-types": "^2.0.5",
    "@nestjs/platform-express": "^10.3.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": { "@nestjs/cli": "^10.3.0", "typescript": "^5.4.0" }
}
EOF

cat > apps/api/src/main.ts << 'EOF'
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010", credentials: true });
  await app.listen(process.env.PORT || 3002);
  console.log("🚀 ContaHub API rodando em http://localhost:3002/api/v1");
}
bootstrap();
EOF

cat > apps/api/src/app.module.ts << 'EOF'
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
EOF

cat > apps/api/src/common/middleware/workspace.middleware.ts << 'EOF'
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
EOF

cat > apps/api/src/common/guards/module.guard.ts << 'EOF'
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
EOF

cat > apps/api/src/modules/health/health.module.ts << 'EOF'
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
@Module({ controllers: [HealthController] })
export class HealthModule {}
EOF

cat > apps/api/src/modules/health/health.controller.ts << 'EOF'
import { Controller, Get } from "@nestjs/common";
import { prisma } from "@contahub/database";
@Controller("health")
export class HealthController {
  @Get()
  async check() {
    await prisma.$queryRaw`SELECT 1`;
    return { data: { status: "ok", timestamp: new Date().toISOString() } };
  }
}
EOF

cat > apps/api/src/modules/clients/clients.module.ts << 'EOF'
import { Module } from "@nestjs/common";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
@Module({ controllers: [ClientsController], providers: [ClientsService], exports: [ClientsService] })
export class ClientsModule {}
EOF

cat > apps/api/src/modules/clients/clients.controller.ts << 'EOF'
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { ModuleGuard } from "../../common/guards/module.guard";
import { ModuleKey } from "@contahub/database";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto, ListClientsDto } from "./dto/update-client.dto";
@Controller("clients")
@UseGuards(ModuleGuard(ModuleKey.CRM))
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}
  @Get() list(@Req() req: Request, @Query() q: ListClientsDto) { return this.clientsService.findAll(req.workspaceId, q); }
  @Get(":id") findOne(@Req() req: Request, @Param("id") id: string) { return this.clientsService.findOne(req.workspaceId, id); }
  @Post() @HttpCode(HttpStatus.CREATED) create(@Req() req: Request, @Body() dto: CreateClientDto) { return this.clientsService.create(req.workspaceId, dto); }
  @Put(":id") update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateClientDto) { return this.clientsService.update(req.workspaceId, id, dto); }
  @Delete(":id") @HttpCode(HttpStatus.NO_CONTENT) remove(@Req() req: Request, @Param("id") id: string) { return this.clientsService.remove(req.workspaceId, id); }
}
EOF

cat > apps/api/src/modules/clients/clients.service.ts << 'EOF'
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto, ListClientsDto } from "./dto/update-client.dto";
@Injectable()
export class ClientsService {
  async findAll(workspaceId: string, { page = 1, limit = 20, search, status }: ListClientsDto) {
    const where = { workspaceId, ...(status && { status }), ...(search && { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { cnpj: { contains: search } }] }) };
    const [data, total] = await Promise.all([prisma.client.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }), prisma.client.count({ where })]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async findOne(workspaceId: string, id: string) {
    const client = await prisma.client.findFirst({ where: { id, workspaceId } });
    if (!client) throw new NotFoundException("Cliente não encontrado");
    return { data: client };
  }
  async create(workspaceId: string, dto: CreateClientDto) {
    const existing = await prisma.client.findUnique({ where: { workspaceId_cnpj: { workspaceId, cnpj: dto.cnpj } } });
    if (existing) throw new ConflictException("CNPJ já cadastrado");
    return { data: await prisma.client.create({ data: { workspaceId, ...dto } }), message: "Cliente cadastrado" };
  }
  async update(workspaceId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(workspaceId, id);
    return { data: await prisma.client.update({ where: { id }, data: dto }), message: "Cliente atualizado" };
  }
  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    await prisma.client.update({ where: { id }, data: { status: "INACTIVE" } });
  }
}
EOF

cat > apps/api/src/modules/clients/dto/create-client.dto.ts << 'EOF'
import { IsString, IsEmail, IsOptional, IsEnum, IsArray, MinLength, Matches } from "class-validator";
import { TaxRegime } from "@contahub/database";
export class CreateClientDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @IsOptional() tradeName?: string;
  @IsString() @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido" }) cnpj!: string;
  @IsEnum(TaxRegime) taxRegime!: TaxRegime;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() notes?: string;
  @IsArray() @IsOptional() tags?: string[];
}
EOF

cat > apps/api/src/modules/clients/dto/update-client.dto.ts << 'EOF'
import { PartialType } from "@nestjs/mapped-types";
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ClientStatus } from "@contahub/database";
import { CreateClientDto } from "./create-client.dto";
export class UpdateClientDto extends PartialType(CreateClientDto) {}
export class ListClientsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
}
EOF

cat > apps/api/src/modules/fiscal/fiscal.module.ts << 'EOF'
import { Module } from "@nestjs/common";
import { FiscalController } from "./fiscal.controller";
import { FiscalService } from "./fiscal.service";
@Module({ controllers: [FiscalController], providers: [FiscalService], exports: [FiscalService] })
export class FiscalModule {}
EOF

cat > apps/api/src/modules/fiscal/fiscal.controller.ts << 'EOF'
import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { ModuleGuard } from "../../common/guards/module.guard";
import { ModuleKey } from "@contahub/database";
import { FiscalService } from "./fiscal.service";
import { CreateObligationDto } from "./dto/create-obligation.dto";
@Controller("fiscal/obligations")
@UseGuards(ModuleGuard(ModuleKey.FISCAL))
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}
  @Get() list(@Req() req: Request, @Query("clientId") c?: string, @Query("status") s?: string, @Query("month") m?: string, @Query("year") y?: string) {
    return this.fiscalService.findAll(req.workspaceId, { clientId: c, status: s, month: m ? +m : undefined, year: y ? +y : undefined });
  }
  @Get("upcoming") upcoming(@Req() req: Request, @Query("days") days = "7") { return this.fiscalService.findUpcoming(req.workspaceId, +days); }
  @Post() @HttpCode(HttpStatus.CREATED) create(@Req() req: Request, @Body() dto: CreateObligationDto) { return this.fiscalService.create(req.workspaceId, dto); }
  @Put(":id/complete") complete(@Req() req: Request, @Param("id") id: string) { return this.fiscalService.markCompleted(req.workspaceId, id); }
}
EOF

cat > apps/api/src/modules/fiscal/fiscal.service.ts << 'EOF'
import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, ObligationStatus } from "@contahub/database";
import { CreateObligationDto } from "./dto/create-obligation.dto";
@Injectable()
export class FiscalService {
  async findAll(workspaceId: string, { clientId, status, month, year }: { clientId?: string; status?: string; month?: number; year?: number }) {
    return { data: await prisma.fiscalObligation.findMany({ where: { workspaceId, ...(clientId && { clientId }), ...(status && { status: status as ObligationStatus }), ...(month && { competenceMonth: month }), ...(year && { competenceYear: year }) }, include: { client: { select: { id: true, name: true, cnpj: true } } }, orderBy: { dueDate: "asc" } }) };
  }
  async findUpcoming(workspaceId: string, days: number) {
    const now = new Date(); const future = new Date(now.getTime() + days * 86400000);
    return { data: await prisma.fiscalObligation.findMany({ where: { workspaceId, status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: now, lte: future } }, include: { client: { select: { id: true, name: true, whatsapp: true } } }, orderBy: { dueDate: "asc" } }) };
  }
  async create(workspaceId: string, dto: CreateObligationDto) {
    return { data: await prisma.fiscalObligation.create({ data: { workspaceId, ...dto }, include: { client: { select: { id: true, name: true } } } }), message: "Obrigação cadastrada" };
  }
  async markCompleted(workspaceId: string, id: string) {
    if (!await prisma.fiscalObligation.findFirst({ where: { id, workspaceId } })) throw new NotFoundException("Obrigação não encontrada");
    return { data: await prisma.fiscalObligation.update({ where: { id }, data: { status: ObligationStatus.COMPLETED, completedAt: new Date() } }), message: "Concluída!" };
  }
}
EOF

cat > apps/api/src/modules/fiscal/dto/create-obligation.dto.ts << 'EOF'
import { IsString, IsEnum, IsInt, IsOptional, IsDateString, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ObligationType } from "@contahub/database";
export class CreateObligationDto {
  @IsString() clientId!: string;
  @IsEnum(ObligationType) type!: ObligationType;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) competenceMonth!: number;
  @Type(() => Number) @IsInt() @Min(2020) competenceYear!: number;
  @IsDateString() dueDate!: string;
  @Type(() => Number) @IsInt() @IsOptional() amount?: number;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() assignedTo?: string;
}
EOF

# apps/web
cat > apps/web/package.json << 'EOF'
{
  "name": "@contahub/web",
  "version": "0.0.1",
  "private": true,
  "scripts": { "build": "next build", "dev": "next dev --port 3000", "start": "next start", "lint": "next lint" },
  "dependencies": { "@clerk/nextjs": "^5.0.0", "@contahub/shared": "workspace:*", "next": "14.2.0", "react": "^18.3.0", "react-dom": "^18.3.0" },
  "devDependencies": { "@types/node": "^20.0.0", "@types/react": "^18.3.0", "autoprefixer": "^10.4.0", "postcss": "^8.4.0", "tailwindcss": "^3.4.0", "typescript": "^5.4.0" }
}
EOF

cat > apps/web/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
module.exports = { transpilePackages: ["@contahub/shared"] };
EOF

cat > apps/web/middleware.ts << 'EOF'
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/portal(.*)"]);
export default clerkMiddleware((auth, request) => { if (!isPublicRoute(request)) auth().protect(); });
export const config = { matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"] };
EOF

cat > apps/web/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cat > apps/web/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
export const metadata: Metadata = { title: "ContaHub", description: "Gestão para escritórios de contabilidade" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html lang="pt-BR"><body>{children}</body></html></ClerkProvider>;
}
EOF

cat > "apps/web/app/(dashboard)/layout.tsx" << 'EOF'
import { UserButton } from "@clerk/nextjs";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex items-center p-6 border-b"><span className="text-xl font-bold text-blue-600">ContaHub</span></div>
        <nav className="p-4 space-y-1">
          <a href="/dashboard" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Dashboard</a>
          <a href="/dashboard/clients" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Clientes</a>
          <a href="/dashboard/fiscal" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Fiscal</a>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t"><UserButton afterSignOutUrl="/" /></div>
      </aside>
      <main className="pl-64"><div className="p-8">{children}</div></main>
    </div>
  );
}
EOF

cat > "apps/web/app/(dashboard)/dashboard/page.tsx" << 'EOF'
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Bem-vindo ao ContaHub</p>
      <div className="mt-8 grid grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Clientes Ativos</p><p className="mt-2 text-3xl font-bold">—</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Obrigações Pendentes</p><p className="mt-2 text-3xl font-bold">—</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6"><p className="text-sm text-gray-500">Vencendo Hoje</p><p className="mt-2 text-3xl font-bold text-red-600">—</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">Concluídas no Mês</p><p className="mt-2 text-3xl font-bold">—</p></div>
      </div>
    </div>
  );
}
EOF

# apps/jobs
cat > apps/jobs/package.json << 'EOF'
{ "name": "@contahub/jobs", "version": "0.0.1", "private": true, "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc" }, "dependencies": { "@contahub/database": "workspace:*", "bullmq": "^5.0.0" }, "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0" } }
EOF
cat > apps/jobs/src/index.ts << 'EOF'
console.log("🔧 ContaHub Jobs — Fase 3");
EOF

# CI/CD
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on:
  pull_request:
    branches: [main, develop]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
EOF

cat > .github/workflows/staging.yml << 'EOF'
name: Deploy Staging
on:
  push:
    branches: [develop]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Configure Railway e Vercel tokens nos secrets"
EOF

cat > .github/workflows/production.yml << 'EOF'
name: Deploy Production
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: echo "Configure Railway e Vercel tokens nos secrets"
EOF

echo ""
echo "✅ Scaffolding criado! $(find . -type f | grep -v node_modules | grep -v .git | wc -l) arquivos"
