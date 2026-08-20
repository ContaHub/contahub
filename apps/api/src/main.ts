import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException, Catch, ArgumentsHost, HttpException, ExceptionFilter, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

// ─── Filtro global — loga TODOS os erros no terminal ─────────
@Catch()
class AllExceptionsLogger implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const req    = ctx.getRequest();
    const res    = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body   = exception instanceof HttpException ? exception.getResponse() : { message: "Erro interno do servidor" };

    // Log no terminal — só loga 500 como ERROR, o resto como WARN
    const msg = `${req.method} ${req.url} → ${status}`;
    if (status >= 500) {
      this.logger.error(msg, exception instanceof Error ? exception.stack : String(exception));
    } else if (status >= 400) {
      this.logger.warn(`${msg} | ${JSON.stringify(body)}`);
    }

    res.status(status).json(body);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api/v1");

  // Filtro de exceções — registrado antes do ValidationPipe
  app.useGlobalFilters(new AllExceptionsLogger());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((err) => {
          if (err.constraints?.whitelistValidation) {
            return `Campo não permitido: ${err.property}`;
          }
          const first = Object.values(err.constraints ?? {}).at(0) ?? "Campo inválido";
          const fieldLabels: Record<string, string> = {
            name: "Nome",
            cnpj: "CNPJ",
            taxRegime: "Regime tributário",
            email: "E-mail",
            phone: "Telefone",
            whatsapp: "WhatsApp",
            portalEmail: "E-mail do portal",
            portalEnabled: "Acesso ao portal",
          };
          const label = fieldLabels[err.property] ?? err.property;
          return `${label}: ${first}`;
        });
        return new BadRequestException(messages.join(" | "));
      },
    })
  );

  app.enableCors({ 
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010",
    credentials: true 
  });
  await app.listen(3002);
  console.log("🚀 ContaHub API rodando em http://localhost:3002/api/v1");
}
bootstrap();