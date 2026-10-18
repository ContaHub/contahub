import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { CreateClientDto } from "./dto/create-client.dto";
//import { CreateClientFreeDto } from "./dto/create-client-free.dto";
import { UpdateClientDto, ListClientsDto } from "./dto/update-client.dto";
import { JobsProducerService } from "../jobs/jobs-producer.service";
import { PORTAL_PRESETS } from "@contahub/shared";

// Campos mínimos que o envio de boas-vindas precisa de um cliente
interface PortalWelcomeTarget {
  name: string;
  portalEnabled: boolean;
  portalEmail: string | null;
  whatsapp: string | null;
  phone: string | null;
}

// Quais canais realmente tiveram o link enfileirado
export interface PortalWelcomeResult {
  email: boolean;
  whatsapp: boolean;
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  // Cooldown por cliente: evita que cliques repetidos mandem várias mensagens iguais ao WhatsApp
  // do cliente final. Em memória basta enquanto a API roda em uma instância só (Render atual);
  // se escalar horizontalmente, mover para Redis.
  private readonly resendCooldown = new Map<string, number>();
  private static readonly RESEND_COOLDOWN_MS = 60_000;

  constructor(private readonly jobsProducer: JobsProducerService) {}

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

    const client = await prisma.client.create({
      data: {
        workspaceId,
        ...dto,
        // Sem escolha explícita, o cliente novo nasce com o preset Padrão
        // (e não com o default do banco, que libera tudo).
        portalPermissions: dto.portalPermissions ?? [...PORTAL_PRESETS.STANDARD.permissions],
      } as any,
    });
    this.logger.log(`Cliente criado: ${client.id}`);

    await this.sendPortalWelcome(workspaceId, client);

    return { data: client, message: "Cliente cadastrado" };
  }

  async update(workspaceId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(workspaceId, id);
    return { data: await prisma.client.update({ where: { id }, data: dto }), message: "Cliente atualizado" };
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    await prisma.client.update({ where: { id }, data: { status: "INACTIVE" } });
  }

  async reactivate(workspaceId: string, id: string) {
  // findOne garante que o cliente pertence ao workspace antes de alterar
  await this.findOne(workspaceId, id);
  const client = await prisma.client.update({ where: { id }, data: { status: "ACTIVE" } });
  return { data: client, message: "Cliente reativado" };
}

  // ──────────────────────────────────────────────────────────────────────────
  // Reenvia o link de acesso ao portal (botão "Reenviar acesso" na tabela de clientes)
  // ──────────────────────────────────────────────────────────────────────────
  async resendPortalAccess(workspaceId: string, id: string) {
    // findOne já filtra por workspaceId — não dá para reenviar para cliente de outro escritório
    const { data: client } = await this.findOne(workspaceId, id);

    if (!client.portalEnabled || !client.portalEmail) {
      throw new BadRequestException("Habilite o portal e informe o e-mail de acesso do cliente antes de reenviar.");
    }

    const last = this.resendCooldown.get(id) ?? 0;
    if (Date.now() - last < ClientsService.RESEND_COOLDOWN_MS) {
      throw new HttpException("Acesso reenviado há pouco. Aguarde 1 minuto para tentar de novo.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const sent = await this.sendPortalWelcome(workspaceId, client);

    if (!sent.email && !sent.whatsapp) {
      throw new BadRequestException(
        "Não foi possível enviar: confira os canais ativos em Configurações e o WhatsApp/telefone do cliente.",
      );
    }

    this.resendCooldown.set(id, Date.now());
    return { data: sent, message: "Acesso reenviado" };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Envia o link do portal pelos canais ativos no workspace (e-mail e/ou WhatsApp).
  // Nunca lança erro: falha de notificação não pode desfazer o cadastro do cliente.
  // Retorna quais canais foram enfileirados, para o reenvio informar o contador.
  // ──────────────────────────────────────────────────────────────────────────
  private async sendPortalWelcome(workspaceId: string, client: PortalWelcomeTarget): Promise<PortalWelcomeResult> {
    const result: PortalWelcomeResult = { email: false, whatsapp: false };

    // O login do portal é por e-mail, então sem portalEmail não há acesso a liberar
    if (!client.portalEnabled || !client.portalEmail) return result;

    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { slug: true, name: true, notificationChannels: true },
      });

      const channels = workspace?.notificationChannels ?? ["WHATSAPP"];
      // 'BOTH' é um valor legado — mantido por compatibilidade com o código anterior
      const sendEmail = channels.includes("EMAIL") || channels.includes("BOTH");
      const sendWhatsapp = channels.includes("WHATSAPP") || channels.includes("BOTH");

      const workspaceName = workspace?.name ?? "ContaHub";
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/portal/${workspace?.slug ?? ""}`;

      // allSettled: se um canal falhar, o outro ainda é tentado
      const [emailRes, whatsappRes] = await Promise.allSettled([
        sendEmail
          ? this.jobsProducer.queuePortalWelcome({
              email: client.portalEmail,
              recipientName: client.name,
              workspaceName,
              portalUrl,
            })
          : Promise.resolve(),
        sendWhatsapp
          ? this.jobsProducer.queuePortalWelcomeWhatsapp({
              // WhatsApp dedicado tem prioridade; telefone é o fallback
              phone: client.whatsapp ?? client.phone,
              recipientName: client.name,
              workspaceName,
              portalUrl,
            })
          : Promise.resolve(false),
      ]);

      // e-mail: canal ativo + enfileirou sem erro
      result.email = sendEmail && emailRes.status === "fulfilled";
      // WhatsApp: o producer devolve true só se o número era válido
      result.whatsapp = whatsappRes.status === "fulfilled" && whatsappRes.value === true;

      if (emailRes.status === "rejected") {
        this.logger.error(`Falha ao enfileirar e-mail de boas-vindas: ${emailRes.reason}`);
      }
      if (whatsappRes.status === "rejected") {
        this.logger.error(`Falha ao enfileirar WhatsApp de boas-vindas: ${whatsappRes.reason}`);
      }
    } catch (err) {
      this.logger.error(`Erro ao preparar boas-vindas do portal: ${err}`);
    }

    return result;
  }
}