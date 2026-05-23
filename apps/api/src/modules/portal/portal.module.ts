import { Module } from "@nestjs/common";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { SupabaseService } from "../../common/services/supabase.service";
import { WahaService } from "../../common/services/waha.service";

@Module({
  controllers: [PortalController],
  providers: [PortalService, SupabaseService, WahaService],
})
export class PortalModule {}
