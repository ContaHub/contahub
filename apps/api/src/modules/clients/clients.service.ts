import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { prisma } from "@contahub/database";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto, ListClientsDto } from "./dto/update-client.dto";
import { JobsProducerService } from '../jobs/jobs-producer.service';

@Injectable()
export class ClientsService {
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

    const client = await prisma.client.create({ data: { workspaceId, ...dto } });

    console.log(`[ClientsService] Cliente criado: ${client.id}`);
    console.log(`[ClientsService] portalEnabled: ${client.portalEnabled}`);
    console.log(`[ClientsService] portalEmail: ${client.portalEmail}`);

    if (client.portalEnabled && client.portalEmail) {
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { slug: true, name: true, notificationChannels: true },
        });

        console.log(`[ClientsService] notificationChannels: ${JSON.stringify(workspace?.notificationChannels)}`);

        const channels = workspace?.notificationChannels ?? ['WHATSAPP'];
        const shouldSendEmail = channels.includes('EMAIL') || channels.includes('BOTH');

        console.log(`[ClientsService] shouldSendEmail: ${shouldSendEmail}`);

        if (shouldSendEmail) {
          await this.jobsProducer.queuePortalWelcome({
            email: client.portalEmail,
            recipientName: client.name,
            workspaceName: workspace?.name ?? 'ContaHub',
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'}/portal/${workspace?.slug ?? ''}`,
          });
          console.log(`[ClientsService] ✓ Welcome email enfileirado para: ${client.portalEmail}`);
        } else {
          console.log(`[ClientsService] ✗ E-mail não enviado — canal EMAIL não está ativo nos channels`);
        }
      } catch (emailError) {
        console.error('[ClientsService] ✗ Erro ao enfileirar welcome email:', emailError);
      }
    } else {
      console.log(`[ClientsService] ✗ Condição não atendida — portalEnabled=${client.portalEnabled} portalEmail=${client.portalEmail}`);
    }

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
}