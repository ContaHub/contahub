import { Controller, Get } from "@nestjs/common";
import { prisma } from "@contahub/database";
@Controller("health")
export class HealthController {
  @Get()
  async check() {
    await prisma.$queryRaw`SELECT 1`;
    return { data: { status: "ok", timestamp: new Date().toISOString() } };
  }
}
