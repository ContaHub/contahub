import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { SupabaseService } from "../../common/services/supabase.service";
import { PortalNoticesService } from "../jobs/portal-notices.service";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/xml",
  "application/xml",
];
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "xls", "xlsx", "xml"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateFileType(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
  }
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new BadRequestException(`Extensão de arquivo não permitida: .${extension}`);
  }
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notices: PortalNoticesService,
  ) {}

  async findAll(workspaceId: string, clientId?: string) {
    const documents = await prisma.document.findMany({
      where: { workspaceId, ...(clientId && { clientId }) },
      include: { client: { select: { id: true, name: true, tradeName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { data: documents };
  }

  async findOne(workspaceId: string, id: string) {
    const doc = await prisma.document.findFirst({
      where: { id, workspaceId },
      include: { client: { select: { id: true, name: true, tradeName: true } } },
    });
    if (!doc) throw new NotFoundException("Documento não encontrado");
    return { data: doc };
  }

  async getDownloadUrl(workspaceId: string, id: string) {
    const { data: doc } = await this.findOne(workspaceId, id);
    if (!doc.storageKey) throw new BadRequestException("Documento ainda não foi enviado");
    const url = await this.supabase.getSignedUrl(doc.storageKey);
    if (!url) throw new BadRequestException("Erro ao gerar URL de download");
    this.logger.log(`⬇ Download — "${doc.name}" | Cliente: ${doc.client?.tradeName ?? doc.clientId}`);
    return { data: { url, expiresIn: 3600 } };
  }

  async upload(
    workspaceId: string,
    clientId: string,
    file: Express.Multer.File,
    createdBy: string,
    description?: string,
    visibleToClient: boolean = true,
  ) {
    validateFileType(file);
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException("Arquivo muito grande. Máximo: 10MB");

    const client = await prisma.client.findFirst({ where: { id: clientId, workspaceId } });
    if (!client) throw new NotFoundException("Cliente não encontrado");

    const timestamp = Date.now();
    const safeName  = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${workspaceId}/${clientId}/${timestamp}-${safeName}`;

    const uploadResult = await this.supabase.upload(storageKey, file.buffer, file.mimetype);
    if (!uploadResult) throw new BadRequestException("Erro ao fazer upload do arquivo");

    const document = await prisma.document.create({
      data: {
        workspaceId, clientId,
        name: file.originalname,
        description,
        status: "UPLOADED",
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        createdBy,
        visibleToClient,
      } as any,
      include: { client: { select: { id: true, name: true, tradeName: true } } },
    });

    this.logger.log(
      `📎 Upload — "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB) | Cliente: ${client.tradeName} | Por: ${createdBy}`,
    );

    // Só avisa se o cliente de fato vai ver o documento (a caixa "Visível para o cliente")
    if (visibleToClient) {
      await this.notices.notifyDocumentShared({
        workspaceId,
        clientId,
        documentId: document.id,
        documentLabel: description || file.originalname,
      });
    }

    return { data: document, message: "Documento enviado com sucesso" };
  }

  async remove(workspaceId: string, id: string) {
    const { data: doc } = await this.findOne(workspaceId, id);

    if (doc.storageKey) await this.supabase.delete(doc.storageKey);
    await prisma.document.delete({ where: { id } });

    this.logger.warn(
      `🗑 Removido — "${doc.name}" | Cliente: ${doc.client?.tradeName ?? doc.clientId}`,
    );

    return { message: "Documento removido com sucesso" };
  }

  async sendForReview(workspaceId: string, id: string) {
    const { data: doc } = await this.findOne(workspaceId, id);

    const updated = await prisma.document.update({
      where: { id },
      data: { status: "UNDER_REVIEW", visibleToClient: true } as any,   // ← visibleToClient: true
      include: { client: { select: { id: true, name: true, tradeName: true } } },
    });

    this.logger.log(
      `Enviado para revisão — "${doc.name}" | Cliente: ${doc.client?.tradeName ?? doc.clientId}`,
    );

        await this.notices.notifyDocumentForReview({
      workspaceId,
      clientId: doc.clientId,
      documentId: id,
      documentLabel: doc.description || doc.name,
    });

    return { data: updated, message: "Documento enviado para aprovação do cliente" };
  }

    async setVisibility(workspaceId: string, id: string, visible: boolean) {
    const { data: doc } = await this.findOne(workspaceId, id);

    // O que o cliente enviou ele sempre vê (regra do filtro do portal)
    if (doc.createdBy?.startsWith("client:")) {
      throw new BadRequestException(
        "Documentos enviados pelo cliente sempre ficam visíveis para ele.",
      );
    }

    // Esconder um documento em revisão o tiraria da aba de aprovação do cliente
    if (!visible && doc.status === "UNDER_REVIEW") {
      throw new BadRequestException(
        "Documento em revisão precisa ficar visível para o cliente.",
      );
    }

    // (depois das duas validações e antes do prisma.document.update)
    const wasHidden = (doc as any).visibleToClient === false;

    const updated = await prisma.document.update({
      where: { id },
      data: { visibleToClient: visible } as any,
      include: { client: { select: { id: true, name: true, tradeName: true } } },
    });

    this.logger.log(
      `${visible ? "Visível" : "Oculto"} no portal — "${doc.name}" | Cliente: ${doc.client?.tradeName ?? doc.clientId}`,
    );

        // (depois do update e do logger, antes do return)
    if (visible && wasHidden) {
      await this.notices.notifyDocumentShared({
        workspaceId,
        clientId: doc.clientId,
        documentId: id,
        documentLabel: doc.description || doc.name,
      });
    }

    return {
      data: updated,
      message: visible
        ? "Documento visível para o cliente"
        : "Documento oculto do cliente",
    };
  }
}