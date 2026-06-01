import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from '@contahub/shared';
import { EcacController } from './ecac.controller';
import { EcacService } from './ecac.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.ECAC }),
  ],
  controllers: [EcacController],
  providers: [EcacService],
})
export class EcacModule {}
