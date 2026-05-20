import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { SupabaseService } from "../../common/services/supabase.service";

// Tipos MIME permitidos para upload
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class DocumentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(workspaceId: string, clientId?: string) {
    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        ...(clientId && { clientId }),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: documents };
  }

  async findOne(workspaceId: string, id: string) {
    const doc = await prisma.document.findFirst({
      where: { id, workspaceId },
      include: { client: { select: { id: true, name: true } } },
    });

    if (!doc) throw new NotFoundException("Documento não encontrado");
    return { data: doc };
  }

  // Gera URL assinada para download seguro (válida por 1h)
  async getDownloadUrl(workspaceId: string, id: string) {
    const { data: doc } = await this.findOne(workspaceId, id);

    if (!doc.storageKey) {
      throw new BadRequestException("Documento ainda não foi enviado");
    }

    const url = await this.supabase.getSignedUrl(doc.storageKey);
    if (!url) throw new BadRequestException("Erro ao gerar URL de download");

    return { data: { url, expiresIn: 3600 } };
  }

  // Faz upload do arquivo e cria o registro no banco
  async upload(
    workspaceId: string,
    clientId: string,
    file: Express.Multer.File,
    createdBy: string,
    description?: string
  ) {
    // Validações
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Aceitos: PDF, imagens, Excel, XML`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException("Arquivo muito grande. Máximo: 10MB");
    }

    // Verifica se o cliente pertence ao workspace
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) throw new NotFoundException("Cliente não encontrado");

    // Monta a chave do storage: workspaceId/clientId/timestamp-filename
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${workspaceId}/${clientId}/${timestamp}-${safeName}`;

    // Faz upload para o Supabase
    const uploadResult = await this.supabase.upload(
      storageKey,
      file.buffer,
      file.mimetype
    );

    if (!uploadResult) {
      throw new BadRequestException("Erro ao fazer upload do arquivo");
    }

    // Cria o registro no banco
    const document = await prisma.document.create({
      data: {
        workspaceId,
        clientId,
        name: file.originalname,
        description,
        status: "UPLOADED",
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        createdBy,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return { data: document, message: "Documento enviado com sucesso" };
  }

  // Remove documento do storage e do banco
  async remove(workspaceId: string, id: string) {
    const { data: doc } = await this.findOne(workspaceId, id);

    // Remove do Supabase
    if (doc.storageKey) {
      await this.supabase.delete(doc.storageKey);
    }

    // Remove do banco
    await prisma.document.delete({ where: { id } });

    return { message: "Documento removido com sucesso" };
  }
}
