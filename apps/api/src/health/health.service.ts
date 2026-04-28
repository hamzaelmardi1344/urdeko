import { Injectable } from "@nestjs/common";
import { previewHealthSchema } from "@bep/shared-types";
import Redis from "ioredis";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  async preview() {
    const [dbReachable, redisReachable] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return previewHealthSchema.parse({
      ok: dbReachable && redisReachable,
      environment: this.env.get("NODE_ENV"),
      apiUrl: this.env.get("PUBLIC_API_URL"),
      dbReachable,
      redisReachable,
      checkedAt: new Date().toISOString(),
    });
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    const redis = new Redis(this.env.get("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_500,
      commandTimeout: 1_500,
    });
    try {
      await redis.connect();
      await redis.ping();
      return true;
    } catch {
      return false;
    } finally {
      redis.disconnect();
    }
  }
}
