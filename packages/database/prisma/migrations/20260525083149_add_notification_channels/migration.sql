-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "notificationChannels" TEXT[] DEFAULT ARRAY['WHATSAPP']::TEXT[];
