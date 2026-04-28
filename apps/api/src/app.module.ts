import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "./ai/ai.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { CustomersModule } from "./customers/customers.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { validateEnv } from "./config/env";
import { AppConfigModule } from "./config/app-config.module";
import { EnvService } from "./config/env.service";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { ShopGuard } from "./common/guards/shop.guard";
import { AuthGuard } from "./common/guards/auth.guard";
import { ShopsModule } from "./shops/shops.module";
import { StorefrontModule } from "./storefront/storefront.module";
import { UploadsModule } from "./uploads/uploads.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        redact: ["req.headers.authorization", "req.body.phoneE164", "req.body.addressLine"],
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        connection: { url: env.get("REDIS_URL") },
      }),
    }),
    PrismaModule,
    AuthModule,
    ShopsModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    DeliveryModule,
    NotificationsModule,
    IntegrationsModule,
    AiModule,
    BillingModule,
    AnalyticsModule,
    StorefrontModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ShopGuard },
  ],
})
export class AppModule {}
