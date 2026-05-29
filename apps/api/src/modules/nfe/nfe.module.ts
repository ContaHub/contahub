import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { NfeController } from './nfe.controller';
import { NfeService } from './nfe.service';

@Module({
  imports: [
    // Mantém arquivo em memória (buffer) — não salva em disco
    // O XML é pequeno (~50kb), sem necessidade de storage temporário
    MulterModule.register({ storage: undefined }),
  ],
  controllers: [NfeController],
  providers:   [NfeService],
  exports:     [NfeService],
})
export class NfeModule {}