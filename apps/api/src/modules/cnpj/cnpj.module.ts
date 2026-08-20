import { Module } from '@nestjs/common';
import { CnpjController } from './cnpj.controller';
import { CnpjService } from './cnpj.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports:     [JobsModule],
  controllers: [CnpjController],
  providers:   [CnpjService],
  exports:     [CnpjService],
})
export class CnpjModule {}