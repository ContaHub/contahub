import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [
    // Multer com memoryStorage — arquivo fica no Buffer em memória
    // (não grava em disco, mais seguro para arquivos sensíveis)
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  // Exportar o service para o EcacWorker usar downloadDecryptedPfx()
  exports: [CertificatesService],
})
export class CertificatesModule {}
