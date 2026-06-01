-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'INVALID', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PendencyType" AS ENUM ('DEBT', 'DECLARATION', 'INSTALLMENT', 'PROCESS', 'SIMPLES', 'OTHER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "ecacAlertCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ecacLastChecked" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "client_certificates" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecac_consultations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "contentHash" TEXT,

    CONSTRAINT "ecac_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecac_pendencies" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "PendencyType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "dueDate" TIMESTAMP(3),
    "situation" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecac_pendencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_certificates_clientId_key" ON "client_certificates"("clientId");

-- CreateIndex
CREATE INDEX "ecac_consultations_clientId_idx" ON "ecac_consultations"("clientId");

-- CreateIndex
CREATE INDEX "ecac_consultations_workspaceId_idx" ON "ecac_consultations"("workspaceId");

-- CreateIndex
CREATE INDEX "ecac_pendencies_clientId_idx" ON "ecac_pendencies"("clientId");

-- CreateIndex
CREATE INDEX "ecac_pendencies_workspaceId_idx" ON "ecac_pendencies"("workspaceId");

-- CreateIndex
CREATE INDEX "ecac_pendencies_consultationId_idx" ON "ecac_pendencies"("consultationId");

-- AddForeignKey
ALTER TABLE "client_certificates" ADD CONSTRAINT "client_certificates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecac_consultations" ADD CONSTRAINT "ecac_consultations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecac_pendencies" ADD CONSTRAINT "ecac_pendencies_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "ecac_consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
