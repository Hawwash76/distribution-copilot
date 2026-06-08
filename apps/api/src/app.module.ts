import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { configuration } from "./config/configuration";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { ProductsModule } from "./modules/products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
    AuthModule,
    ProductsModule,
  ],
})
export class AppModule {}
