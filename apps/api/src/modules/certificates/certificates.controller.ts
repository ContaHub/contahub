import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from './certificates.service';
import { UploadCertificateDto } from './dto/upload-certificate.dto';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * POST /api/v1/certificates/:clientId/upload
   * Recebe o arquivo .pfx (multipart) + senha no body.
   * Valida, criptografa e armazena no Supabase.
   */
  @Post(':clientId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
      fileFilter: (_req, file, cb) => {
        // Aceitar apenas .pfx e .p12
        const allowed = ['.pfx', '.p12'];
        const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(new BadRequestException('Apenas arquivos .pfx ou .p12 são aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Param('clientId') clientId: string,
    @Body() dto: UploadCertificateDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo .pfx não enviado');
    return this.certificatesService.uploadCertificate(
      req.workspaceId,
      clientId,
      file,
      dto.password,
    );
  }

  /**
   * GET /api/v1/certificates/:clientId
   * Retorna metadados do certificado (validade, status).
   * NUNCA retorna o arquivo .pfx.
   */
  @Get(':clientId')
  async getStatus(@Param('clientId') clientId: string, @Req() req: any) {
    return this.certificatesService.getCertificateStatus(req.workspaceId, clientId);
  }

  /**
   * DELETE /api/v1/certificates/:clientId
   * Remove o certificado do Supabase e do banco.
   */
  @Delete(':clientId')
  async delete(@Param('clientId') clientId: string, @Req() req: any) {
    return this.certificatesService.deleteCertificate(req.workspaceId, clientId);
  }
}
