import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { WahaService } from "../../common/services/waha.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WahaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
