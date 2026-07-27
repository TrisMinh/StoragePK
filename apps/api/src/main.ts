import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "./common/http-error.filter";
import { validateProductionEnvironment } from "./common/security-config";

async function bootstrap(): Promise<void> {
  validateProductionEnvironment();
  const app = await NestFactory.create(AppModule, { cors: false });
  app.use(helmet());
  app.enableCors({ origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","), credentials: true });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new HttpErrorFilter());
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
