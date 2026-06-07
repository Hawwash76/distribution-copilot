import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { configuration } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";

/**
 * Root application module. Feature modules are imported here as they are
 * built (under `./modules`). Cross-cutting concerns live in `./common`.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
  ],
})
export class AppModule {}
