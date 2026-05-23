import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { prisma } from "@contahub/database";
import { SupabaseService } from "../../common/services/supabase.service";
import { WahaService } from "../../common/services/waha.service";
 
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/xml", "application/xml",
];
 
@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);
 
  constructor(
    private readonly supabase: SupabaseService,
    private readonly waha: WahaService,
  ) {}
 
  async getWorkspaceBySlug(slug: string) {
    this.logger.log(`[getWorkspaceBySlug] slug=${slug}`);
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
    });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
    return { data: workspace };
  }
 
  async getClientByEmail(workspaceSlug: string, email: string) {
    this.logger.log(`[getClientByEmail] slug=${workspaceSlug} email=${email}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const client = await prisma.client.findFirst({
      where: { workspaceId: workspace.id, portalEmail: email, portalEnabled: true },
      select: { id: true, name: true, cnpj: true, taxRegime: true },
    });
    if (!client) throw new UnauthorizedException("Acesso não autorizado");
    return { data: client };
  }
 
  async getClientDocuments(workspaceSlug: string, clientId: string) {
    this.logger.log(`[getClientDocuments] slug=${workspaceSlug} clientId=${clientId}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const documents = await prisma.document.findMany({
      where: {
        workspaceId: workspace.id,
        clientId,
        status: { in: ["UPLOADED", "APPROVED"] },
      },
      select: {
        id: true, name: true, description: true,
        status: true, mimeType: true, sizeBytes: true,
        createdAt: true, storageKey: true, createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { data: documents };
  }

  async getClientDocumentDownloadUrl(workspaceSlug: string, documentId: string) {
  this.logger.log(`[getDownloadUrl] slug=${workspaceSlug} docId=${documentId}`);
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new NotFoundException("Escritório não encontrado");

  const doc = await prisma.document.findFirst({
    where: { id: documentId, workspaceId: workspace.id },
  });
  if (!doc?.storageKey) throw new NotFoundException("Documento não encontrado");

  const url = await this.supabase.getSignedUrl(doc.storageKey);
  if (!url) throw new BadRequestException("Erro ao gerar URL de download");

  return { data: { url, expiresIn: 3600 } };
}
 
  async getPendingReports(workspaceSlug: string, clientId: string) {
    this.logger.log(`[getPendingReports] slug=${workspaceSlug} clientId=${clientId}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const reports = await prisma.document.findMany({
      where: { workspaceId: workspace.id, clientId, status: "UNDER_REVIEW" },
      select: { id: true, name: true, description: true, mimeType: true, sizeBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { data: reports };
  }
 
  async getClientObligations(workspaceSlug: string, clientId: string) {
    this.logger.log(`[getClientObligations] slug=${workspaceSlug} clientId=${clientId}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const obligations = await prisma.fiscalObligation.findMany({
      where: { workspaceId: workspace.id, clientId },
      select: {
        id: true, type: true, status: true,
        competenceMonth: true, competenceYear: true,
        dueDate: true, completedAt: true, amount: true,
      },
      orderBy: { dueDate: "desc" },
      take: 20,
    });
    return { data: obligations };
  }
 
  async clientUpload(
    workspaceSlug: string,
    clientId: string,
    file: Express.Multer.File,
    description?: string
  ) {
    this.logger.log(`[clientUpload] slug=${workspaceSlug} clientId=${clientId} file=${file?.originalname} size=${file?.size}`);
 
    if (!file) throw new BadRequestException("Nenhum arquivo enviado");
 
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Tipo de arquivo não permitido. Aceitos: PDF, imagens, Excel, XML");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Arquivo muito grande. Máximo: 10MB");
    }
 
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId: workspace.id, portalEnabled: true },
    });
    if (!client) {
      this.logger.error(`[clientUpload] Cliente não encontrado: ${clientId}`);
      throw new NotFoundException("Cliente não encontrado");
    }
 
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${workspace.id}/${clientId}/client-uploads/${timestamp}-${safeName}`;
 
    this.logger.log(`[clientUpload] Enviando para Supabase: ${storageKey}`);
    const uploadResult = await this.supabase.upload(storageKey, file.buffer, file.mimetype);
    if (!uploadResult) throw new BadRequestException("Erro ao fazer upload para o storage");
 
    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        name: file.originalname,
        description: description ? `[Cliente] ${description}` : "[Enviado pelo cliente]",
        status: "UPLOADED",
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        createdBy: `client:${clientId}`,
      },
    });
 
    this.logger.log(`[clientUpload] Documento salvo no banco: ${document.id}`);
 
    await prisma.communication.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        channel: "PORTAL",
        direction: "inbound",
        subject: `Novo documento enviado: ${file.originalname}`,
        content: `${client.name} enviou um documento: ${file.originalname}`,
        sentAt: new Date(),
      },
    });
 
    return { data: document, message: "Documento enviado com sucesso!" };
  }
 
  async deleteClientDocument(workspaceSlug: string, documentId: string) {
    this.logger.log(`[deleteClientDocument] slug=${workspaceSlug} documentId=${documentId}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId: workspace.id,
        createdBy: { startsWith: "client:" },
      },
    });
 
    if (!doc) throw new NotFoundException("Documento não encontrado ou sem permissão para remover");
 
    if (doc.storageKey) {
      await this.supabase.delete(doc.storageKey);
    }
 
    await prisma.document.delete({ where: { id: documentId } });
    return { message: "Documento removido com sucesso" };
  }
 
  async reviewDocument(
    workspaceSlug: string,
    documentId: string,
    clientId: string,
    action: "APPROVED" | "REJECTED",
    notes?: string
  ) {
    this.logger.log(`[reviewDocument] slug=${workspaceSlug} docId=${documentId} action=${action}`);
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new NotFoundException("Escritório não encontrado");
 
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId: workspace.id, clientId, status: "UNDER_REVIEW" },
      include: { client: { select: { name: true } } },
    });
 
    if (!document) throw new NotFoundException("Relatório não encontrado ou já revisado");
 
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: action as any,
        reviewedAt: new Date(),
        reviewNotes: notes,
        reviewedBy: `client:${clientId}`,
      },
    });
 
    await prisma.communication.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        channel: "PORTAL",
        direction: "inbound",
        subject: action === "APPROVED"
          ? `Relatório aprovado: ${document.name}`
          : `Revisão solicitada: ${document.name}`,
        content: action === "APPROVED"
          ? `${document.client.name} aprovou o relatório "${document.name}".`
          : `${document.client.name} solicitou revisão de "${document.name}". Motivo: ${notes || "Não informado"}`,
        sentAt: new Date(),
      },
    });
 
    return {
      data: updated,
      message: action === "APPROVED" ? "Relatório aprovado!" : "Revisão solicitada. O escritório será notificado.",
    };
  }
}
 