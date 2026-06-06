import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { prisma, ObligationStatus } from "@contahub/database";
import { CreateObligationDto } from "./dto/create-obligation.dto";

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  async findAll(workspaceId: string, { clientId, status, month, year }: { clientId?: string; status?: string; month?: number; year?: number }) {
    const data = await prisma.fiscalObligation.findMany({
      where: {
        workspaceId,
        ...(clientId && { clientId }),
        ...(status && { status: status as ObligationStatus }),
        ...(month && { competenceMonth: month }),
        ...(year && { competenceYear: year }),
      },
      include: { client: { select: { id: true, name: true, tradeName: true, cnpj: true } } },
      orderBy: { dueDate: "asc" },
    });

    // Mapeia para o formato esperado pelo frontend
    const mapped = data.map((o) => ({
      ...o,
      competence: o.competenceMonth && o.competenceYear
        ? `${o.competenceYear}-${String(o.competenceMonth).padStart(2, "0")}`
        : null,
      value: o.amount,
    }));

    return { data: mapped };
  }

  async findUpcoming(workspaceId: string, days: number) {
    const now = new Date(); const future = new Date(now.getTime() + days * 86400000);
    return { data: await prisma.fiscalObligation.findMany({ where: { workspaceId, status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { gte: now, lte: future } }, include: { client: { select: { id: true, name: true, tradeName: true, whatsapp: true } } }, orderBy: { dueDate: "asc" } }) };
  }

  async create(workspaceId: string, dto: CreateObligationDto) {
    const data = await prisma.fiscalObligation.create({ data: { workspaceId, ...dto }, include: { client: { select: { id: true, name: true, tradeName: true } } } });
    this.logger.log(`📋 Criada — ${data.type} | Cliente: ${data.client?.name} | Vencimento: ${data.dueDate?.toLocaleDateString("pt-BR")}`);
    return { data, message: "Obrigação cadastrada" };
  }

  async update(workspaceId: string, id: string, dto: Partial<CreateObligationDto>) {
    const existing = await prisma.fiscalObligation.findFirst({
      where: { id, workspaceId },
      include: { client: { select: { name: true, tradeName: true } } }
    });
    if (!existing) throw new NotFoundException("Obrigação não encontrada");

    // Monta log das alterações comparando antes x depois
    const changes: string[] = [];
    if (dto.type && dto.type !== existing.type)
      changes.push(`tipo: ${existing.type} → ${dto.type}`);
    if (dto.dueDate && new Date(dto.dueDate).toDateString() !== new Date(existing.dueDate).toDateString())
      changes.push(`vencimento: ${existing.dueDate.toLocaleDateString("pt-BR")} → ${new Date(dto.dueDate).toLocaleDateString("pt-BR")}`);
    if (dto.amount !== undefined && dto.amount !== existing.amount)
      changes.push(`valor: ${existing.amount != null ? "R$ " + (existing.amount / 100).toFixed(2) : "—"} → R$ ${(dto.amount / 100).toFixed(2)}`);
    if (dto.competenceMonth && dto.competenceMonth !== existing.competenceMonth)
      changes.push(`mês competência: ${existing.competenceMonth} → ${dto.competenceMonth}`);
    if (dto.competenceYear && dto.competenceYear !== existing.competenceYear)
      changes.push(`ano competência: ${existing.competenceYear} → ${dto.competenceYear}`);
    if (dto.notes !== undefined && dto.notes !== existing.notes)
      changes.push(`observações alteradas`);

    const data = await prisma.fiscalObligation.update({
      where: { id },
      data: dto,
      include: { client: { select: { id: true, name: true, tradeName: true } } }
    });

    const changeLog = changes.length > 0 ? ` | Alterações: ${changes.join(", ")}` : " | Sem alterações detectadas";
    this.logger.log(`✏️ Editada — ${data.type} | Cliente: ${data.client?.tradeName}${changeLog}`);

    return { data, message: "Obrigação atualizada" };
  }

  async markCompleted(workspaceId: string, id: string) {
    const existing = await prisma.fiscalObligation.findFirst({ where: { id, workspaceId }, include: { client: { select: { name: true, tradeName: true } } } });
    if (!existing) throw new NotFoundException("Obrigação não encontrada");
    const data = await prisma.fiscalObligation.update({ where: { id }, data: { status: ObligationStatus.COMPLETED, completedAt: new Date() } });
    this.logger.log(`✅ Concluída — ${existing.type} | Cliente: ${existing.client?.tradeName}`);
    return { data, message: "Concluída!" };
  }

  async remove(workspaceId: string, id: string) {
    const existing = await prisma.fiscalObligation.findFirst({ where: { id, workspaceId }, include: { client: { select: { name: true, tradeName: true } } } });
    if (!existing) throw new NotFoundException("Obrigação não encontrada");
    await prisma.fiscalObligation.delete({ where: { id } });
    this.logger.warn(`🗑 Removida — ${existing.type} | Cliente: ${existing.client?.tradeName}`);
    return { message: "Obrigação removida" };
  }
}