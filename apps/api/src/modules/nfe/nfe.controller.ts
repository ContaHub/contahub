import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { NfeService } from './nfe.service';

@Controller('nfe')
export class NfeController {
  constructor(private readonly nfeService: NfeService) {}

  // ── Upload de XML de NF-e ─────────────────────────────────────────────────
  // POST /api/v1/nfe/upload
  // multipart/form-data — campo: "file" (XML)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { workspaceId: string },
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // Valida extensão e mimetype
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xml') {
      throw new BadRequestException('Apenas arquivos .xml são aceitos');
    }

    const result = await this.nfeService.processarUpload(
      file.buffer,
      req.workspaceId,
    );

    return {
      data:    result.nfe,
      message: result.vinculado
        ? `NF-e importada e vinculada ao cliente ${result.nfe.client?.name}`
        : `NF-e importada — nenhum cliente encontrado para os CNPJs da nota`,
    };
  }

  // ── Listar NF-es do workspace ─────────────────────────────────────────────
  // GET /api/v1/nfe?clientId=xxx (clientId opcional)
  @Get()
  async listar(
    @Req() req: Request & { workspaceId: string },
    @Query('clientId') clientId?: string,
  ) {
    const nfes = await this.nfeService.listar(req.workspaceId, clientId);
    return { data: nfes };
  }

@Delete(':id')
async deletar(
    @Param('id') id: string,
    @Req() req: Request & { workspaceId: string },
  ) {
    await this.nfeService.deletar(id, req.workspaceId);
    return { message: 'NF-e removida com sucesso' };
  }
}