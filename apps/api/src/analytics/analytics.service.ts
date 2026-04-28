import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [pending, today, month] = await Promise.all([
      this.prisma.order.count({ where: { shopId, status: "PENDING" } }),
      this.prisma.order.aggregate({
        where: { shopId, createdAt: { gte: startOfDay } },
        _sum: { totalMAD: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { shopId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { totalMAD: true },
        _count: true,
      }),
    ]);
    return {
      pendingOrders: pending,
      todayOrders: today._count,
      todayRevenueMAD: today._sum.totalMAD ?? 0,
      monthOrders: month._count,
      monthRevenueMAD: month._sum.totalMAD ?? 0,
    };
  }
}
