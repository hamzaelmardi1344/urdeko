import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";
import { EnvService } from "./config/env.service";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  const env = app.get(EnvService);

  const sentryDsn = env.get("SENTRY_DSN");
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, environment: env.get("NODE_ENV") });
  }

  app.enableCors({
    origin: [env.get("PUBLIC_WEB_URL")],
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.get("PORT"), "0.0.0.0");
}

void bootstrap();
