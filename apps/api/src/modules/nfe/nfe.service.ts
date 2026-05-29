import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@contahub/database';
import * as xml2js from 'xml2js';

const prisma = new PrismaClient();

export interface NfeParsed {
  chaveAcesso:      string;
  numero:           string;
  serie:            string;
  dataEmissao:      Date;
  cnpjEmitente:     string;
  nomeEmitente:     string;
  cnpjDestinatario: string;
  nomeDestinatario: string;
  valorTotal:       number; // em centavos
  valorIcms:        number; // em centavos
  valorIss:         number; // em centavos
  naturezaOperacao: string;
}

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);

  // ──────────────────────────────────────────────────────────────────────────
  // Processa o upload de um XML de NF-e
  // 1. Faz o parse do XML
  // 2. Tenta vincular ao cliente pelo CNPJ destinatário
  // 3. Salva no banco
  // 4. Retorna os dados extraídos + clientId se vinculado
  // ──────────────────────────────────────────────────────────────────────────
  async processarUpload(
    xmlBuffer: Buffer,
    workspaceId: string,
    storageKey?: string,
  ) {
    // Parse do XML
    const xmlString = xmlBuffer.toString('utf-8');
    let parsed: NfeParsed;

    try {
      parsed = await this.parseXml(xmlString);
    } catch (err) {
      throw new BadRequestException(`XML inválido ou não é uma NF-e: ${err.message}`);
    }

    this.logger.log(
      `NF-e ${parsed.numero} — Emitente: ${parsed.cnpjEmitente} → Destinatário: ${parsed.cnpjDestinatario}`,
    );

    // Verifica se já foi importada
    const existente = await prisma.nfeDocument.findUnique({
      where: {
        workspaceId_chaveAcesso: {
          workspaceId,
          chaveAcesso: parsed.chaveAcesso,
        },
      },
    });

    if (existente) {
      throw new ConflictException(
        `NF-e ${parsed.numero} já foi importada anteriormente`,
      );
    }

    // Tenta vincular ao cliente pelo CNPJ destinatário
    // (o cliente do escritório é geralmente o destinatário)
    const cnpjDestinatarioLimpo = parsed.cnpjDestinatario.replace(/\D/g, '');
    const cnpjEmitenteLimpo     = parsed.cnpjEmitente.replace(/\D/g, '');

    let clientId: string | null = null;

    // Busca todos os clientes do workspace e compara CNPJs normalizados
    // Necessário pois o banco armazena com formatação (11.222.333/0001-44)
    // e o XML vem sem formatação (11222333000144)
    const todosClientes = await prisma.client.findMany({
      where: { workspaceId },
      select: { id: true, name: true, cnpj: true },
    });
    for (const cnpjBusca of [cnpjDestinatarioLimpo, cnpjEmitenteLimpo]) {
      const cliente = todosClientes.find(
        (c) => c.cnpj.replace(/\D/g, '') === cnpjBusca,
      );

      if (cliente) {
        clientId = cliente.id;
        this.logger.log(`Vinculado ao cliente: ${cliente.name}`);
        break;
      }
    }

    if (!clientId) {
      this.logger.warn(
        `Nenhum cliente encontrado para CNPJs: ${cnpjEmitenteLimpo} / ${cnpjDestinatarioLimpo}`,
      );
    }

    // Salva no banco
    const nfe = await prisma.nfeDocument.create({
      data: {
        workspaceId,
        clientId,
        chaveAcesso:      parsed.chaveAcesso,
        numero:           parsed.numero,
        serie:            parsed.serie,
        dataEmissao:      parsed.dataEmissao,
        cnpjEmitente:     cnpjEmitenteLimpo,
        nomeEmitente:     parsed.nomeEmitente,
        cnpjDestinatario: cnpjDestinatarioLimpo,
        nomeDestinatario: parsed.nomeDestinatario,
        valorTotal:       parsed.valorTotal,
        valorIcms:        parsed.valorIcms,
        valorIss:         parsed.valorIss,
        naturezaOperacao: parsed.naturezaOperacao,
        storageKey,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`NF-e salva: ${nfe.id}`);

    return {
      nfe,
      vinculado: !!clientId,
      parsed,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lista NF-es do workspace com filtros opcionais
  // ──────────────────────────────────────────────────────────────────────────
  async listar(workspaceId: string, clientId?: string) {
    return prisma.nfeDocument.findMany({
      where: {
        workspaceId,
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { dataEmissao: 'desc' },
      take: 100,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Parser interno — extrai os campos relevantes do XML da NF-e
  // Suporta NF-e v3.10 e v4.00 (estrutura idêntica nos campos principais)
  // ──────────────────────────────────────────────────────────────────────────
  private async parseXml(xmlString: string): Promise<NfeParsed> {
    const result = await xml2js.parseStringPromise(xmlString, {
      explicitArray: false,
      ignoreAttrs:   false,
    });

    // A NF-e pode vir com ou sem o envelope nfeProc
    const root  = result.nfeProc ?? result;
    const nfe   = root.NFe ?? root['nfe:NFe'];
    const infNFe = nfe.infNFe;

    if (!infNFe) {
      throw new Error('Estrutura XML não reconhecida como NF-e');
    }

    const ide  = infNFe.ide;
    const emit = infNFe.emit;
    const dest = infNFe.dest;
    const tot  = infNFe.total?.ICMSTot;

    // Chave de acesso fica no atributo Id do infNFe (sem o prefixo "NFe")
    const chaveAcesso = (infNFe.$ ?.Id ?? '').replace(/^NFe/, '');

    // Data de emissão: "2026-05-28T10:00:00-03:00"
    const dataEmissao = new Date(ide.dhEmi ?? ide.dEmi);

    // Valores monetários → centavos (multiplicar por 100)
    const tocentavos = (v: string | undefined) =>
      v ? Math.round(parseFloat(v) * 100) : 0;

    return {
      chaveAcesso,
      numero:           String(ide.nNF),
      serie:            String(ide.serie),
      dataEmissao,
      cnpjEmitente:     emit.CNPJ ?? '',
      nomeEmitente:     emit.xNome ?? emit.xFant ?? '',
      cnpjDestinatario: dest.CNPJ ?? dest.CPF ?? '',
      nomeDestinatario: dest.xNome ?? '',
      valorTotal:       tocentavos(tot?.vNF),
      valorIcms:        tocentavos(tot?.vICMS),
      valorIss:         tocentavos(infNFe.total?.ISSQNtot?.vISS),
      naturezaOperacao: ide.natOp ?? '',
    };
  }
  async deletar(id: string, workspaceId: string) {
  return prisma.nfeDocument.delete({
    where: { id, workspaceId },
  });
}
}