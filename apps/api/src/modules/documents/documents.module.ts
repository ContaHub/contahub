import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { SupabaseService } from "../../common/services/supabase.service";
import { JobsModule } from "../jobs/jobs.module";

@Module({
  imports: [JobsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, SupabaseService],
  exports: [DocumentsService],
})
export class DocumentsModule {}