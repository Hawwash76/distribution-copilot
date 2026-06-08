import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";

import { AppModule } from "./app.module";
import { auth } from "./config/auth";

async function bootstrap(): Promise<void> {
  const adapter = new ExpressAdapter();
  adapter.getInstance().all("/api/auth/*splat", toNodeHandler(auth));

  const app = await NestFactory.create(AppModule, adapter);
  app.enableShutdownHooks();

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>("port") ?? 4000;

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${String(port)}`, "Bootstrap");
}

void bootstrap();
