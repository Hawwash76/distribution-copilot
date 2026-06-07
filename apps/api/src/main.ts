import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>("port") ?? 4000;

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${String(port)}`, "Bootstrap");
}

void bootstrap();
