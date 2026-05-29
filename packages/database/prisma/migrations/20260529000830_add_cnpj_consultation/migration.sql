-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "cnpjLastChecked" TIMESTAMP(3),
ADD COLUMN     "cnpjStatus" TEXT;

-- CreateTable
CREATE TABLE "CnpjConsultation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "situacao" TEXT,
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnpjConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnpjConsultation_workspaceId_idx" ON "CnpjConsultation"("workspaceId");

-- CreateIndex
CREATE INDEX "CnpjConsultation_clientId_idx" ON "CnpjConsultation"("clientId");

-- CreateIndex
CREATE INDEX "CnpjConsultation_workspaceId_consultedAt_idx" ON "CnpjConsultation"("workspaceId", "consultedAt");

-- AddForeignKey
ALTER TABLE "CnpjConsultation" ADD CONSTRAINT "CnpjConsultation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnpjConsultation" ADD CONSTRAINT "CnpjConsultation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
