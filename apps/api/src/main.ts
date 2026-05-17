import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", credentials: true });
  await app.listen(process.env.PORT || 3002);
  console.log("🚀 ContaHub API rodando em http://localhost:3001/api/v1");
}
bootstrap();
