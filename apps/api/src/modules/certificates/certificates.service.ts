import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, CertificateStatus } from '@contahub/database';
import * as forge from 'node-forge';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * CertificatesService
 *
 * Responsável por:
 * 1. Receber o arquivo .pfx do contador
 * 2. Validar a senha usando node-forge (tenta abrir o PKCS#12)
 * 3. Extrair a data de expiração do certificado
 * 4. Criptografar o binário com AES-256-CBC (chave do .env)
 * 5. Fazer upload do arquivo criptografado no Supabase bucket "certificates"
 * 6. Salvar metadados no banco (hash bcrypt da senha, validade, storageKey)
 *
 * NUNCA armazenamos a senha em texto puro.
 * NUNCA retornamos o arquivo .pfx ao frontend.
 */
@Injectable()
export class CertificatesService {
  private prisma = new PrismaClient();

  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private get encryptionKey(): Buffer {
    const key = process.env.CERTIFICATE_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      throw new InternalServerErrorException(
        'CERTIFICATE_ENCRYPTION_KEY inválida — deve ter 64 chars hex (32 bytes)',
      );
    }
    return Buffer.from(key, 'hex');
  }

  private get bucket(): string {
    return process.env.SUPABASE_CERTIFICATES_BUCKET || 'certificates';
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadCertificate(
    workspaceId: string,
    clientId: string,
    file: Express.Multer.File,
    password: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    let expiresAt: Date;
    try {
      expiresAt = this.extractExpiry(file.buffer, password);
    } catch {
      throw new BadRequestException(
        'Não foi possível abrir o certificado. Verifique se o arquivo e a senha estão corretos.',
      );
    }

    const encrypted = this.encryptBuffer(file.buffer);

    const storageKey = `${workspaceId}/${clientId}/${Date.now()}.pfx.enc`;
    const { error: uploadError } = await this.supabase.storage
      .from(this.bucket)
      .upload(storageKey, encrypted, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      throw new InternalServerErrorException(
        `Erro ao salvar certificado: ${uploadError.message}`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const certificate = await this.prisma.clientCertificate.upsert({
      where: { clientId },
      update: {
        storageKey,
        expiresAt,
        passwordHash,
        status: expiresAt > new Date() ? CertificateStatus.ACTIVE : CertificateStatus.EXPIRED,
        updatedAt: new Date(),
      },
      create: {
        clientId,
        storageKey,
        expiresAt,
        passwordHash,
        status: expiresAt > new Date() ? CertificateStatus.ACTIVE : CertificateStatus.EXPIRED,
      },
    });

    return {
      data: {
        id: certificate.id,
        clientId: certificate.clientId,
        expiresAt: certificate.expiresAt,
        status: certificate.status,
        createdAt: certificate.createdAt,
      },
      message: 'Certificado enviado com sucesso',
    };
  }

  // ─── Get metadata ─────────────────────────────────────────────────────────

  async getCertificateStatus(workspaceId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const cert = await this.prisma.clientCertificate.findUnique({
      where: { clientId },
      select: { id: true, expiresAt: true, status: true, createdAt: true, updatedAt: true },
    });

    if (!cert) {
      return { data: null, message: 'Nenhum certificado cadastrado' };
    }

    if (cert.status === CertificateStatus.ACTIVE && cert.expiresAt < new Date()) {
      await this.prisma.clientCertificate.update({
        where: { clientId },
        data: { status: CertificateStatus.EXPIRED },
      });
      cert.status = CertificateStatus.EXPIRED;
    }

    const daysUntilExpiry = Math.ceil(
      (cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return {
      data: { ...cert, daysUntilExpiry, expiringSoon: daysUntilExpiry <= 30 && daysUntilExpiry > 0 },
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async deleteCertificate(workspaceId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    const cert = await this.prisma.clientCertificate.findUnique({ where: { clientId } });
    if (!cert) throw new NotFoundException('Certificado não encontrado');

    await this.supabase.storage.from(this.bucket).remove([cert.storageKey]);
    await this.prisma.clientCertificate.delete({ where: { clientId } });

    return { message: 'Certificado removido com sucesso' };
  }

  // ─── Uso interno pelo EcacWorker ──────────────────────────────────────────

  async downloadDecryptedPfx(clientId: string, plainPassword: string): Promise<Buffer> {
    const cert = await this.prisma.clientCertificate.findUnique({ where: { clientId } });
    if (!cert) throw new NotFoundException('Certificado não encontrado para este cliente');

    const passwordMatch = await bcrypt.compare(plainPassword, cert.passwordHash);
    if (!passwordMatch) throw new BadRequestException('Senha do certificado incorreta');

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(cert.storageKey);

    if (error || !data) {
      throw new InternalServerErrorException('Erro ao baixar certificado do storage');
    }

    const encryptedBuffer = Buffer.from(await data.arrayBuffer());
    return this.decryptBuffer(encryptedBuffer);
  }

  // ─── Helpers criptografia ─────────────────────────────────────────────────

  private extractExpiry(pfxBuffer: Buffer, password: string): Date {
    const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const bags = certBags[forge.pki.oids.certBag];
    if (!bags || bags.length === 0) throw new Error('Nenhum certificado encontrado no .pfx');
    return new Date(bags[0].cert!.validity.notAfter);
  }

  private encryptBuffer(data: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptBuffer(data: Buffer): Buffer {
    const iv = data.subarray(0, 16);
    const encrypted = data.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
