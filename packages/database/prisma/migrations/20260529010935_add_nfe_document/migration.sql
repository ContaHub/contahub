-- CreateTable
CREATE TABLE "NfeDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "chaveAcesso" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "cnpjEmitente" TEXT NOT NULL,
    "nomeEmitente" TEXT NOT NULL,
    "cnpjDestinatario" TEXT NOT NULL,
    "nomeDestinatario" TEXT NOT NULL,
    "valorTotal" INTEGER NOT NULL,
    "valorIcms" INTEGER,
    "valorIss" INTEGER,
    "naturezaOperacao" TEXT,
    "storageKey" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NfeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NfeDocument_workspaceId_idx" ON "NfeDocument"("workspaceId");

-- CreateIndex
CREATE INDEX "NfeDocument_workspaceId_clientId_idx" ON "NfeDocument"("workspaceId", "clientId");

-- CreateIndex
CREATE INDEX "NfeDocument_workspaceId_dataEmissao_idx" ON "NfeDocument"("workspaceId", "dataEmissao");

-- CreateIndex
CREATE UNIQUE INDEX "NfeDocument_workspaceId_chaveAcesso_key" ON "NfeDocument"("workspaceId", "chaveAcesso");

-- AddForeignKey
ALTER TABLE "NfeDocument" ADD CONSTRAINT "NfeDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NfeDocument" ADD CONSTRAINT "NfeDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
