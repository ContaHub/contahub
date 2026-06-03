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
