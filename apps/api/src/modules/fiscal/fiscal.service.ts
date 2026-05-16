import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, ObligationStatus } from "@contahub/database";
import { CreateObligationDto } from "./dto/create-obligation.dto";
@Injectable()
export class FiscalService {
  async findAll(workspaceId: string, { clientId, status, month, year }: { clientId?: string; status?: string; month?: number; year?: number }) {
    return { data: await prisma.fiscalObligation.findMany({ where: { workspaceId, ...(clientId && { clientId }), ...(status && { status: status as ObligationStatus }), ...(month && { competenceMonth: month }), ...(year && { competenceYear: year }) }, include: { client: { select: { id: true, name: true, cnpj: true } } }, orderBy: { dueDate: "asc" } }) };
  }
  async findUpcoming(workspaceId: string, days: number) {
    const now = new Date(); const future = new Date(now.getTime() + days * 86400000);
    return { data: await prisma.fiscalObligation.findMany({ where: { workspaceId, status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: now, lte: future } }, include: { client: { select: { id: true, name: true, whatsapp: true } } }, orderBy: { dueDate: "asc" } }) };
  }
  async create(workspaceId: string, dto: CreateObligationDto) {
    return { data: await prisma.fiscalObligation.create({ data: { workspaceId, ...dto }, include: { client: { select: { id: true, name: true } } } }), message: "Obrigação cadastrada" };
  }
  async markCompleted(workspaceId: string, id: string) {
    if (!await prisma.fiscalObligation.findFirst({ where: { id, workspaceId } })) throw new NotFoundException("Obrigação não encontrada");
    return { data: await prisma.fiscalObligation.update({ where: { id }, data: { status: ObligationStatus.COMPLETED, completedAt: new Date() } }), message: "Concluída!" };
  }
}
