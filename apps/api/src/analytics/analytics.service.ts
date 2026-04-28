import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      shop,
      pending,
      today,
      month,
      codPending,
      codCollected,
      codRemitted,
      topCustomers,
      topProducts,
    ] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { plan: true, monthlyOrderQuota: true },
      }),
      this.prisma.order.count({ where: { shopId, status: "PENDING" } }),
      this.prisma.order.aggregate({
        where: { shopId, createdAt: { gte: startOfDay } },
        _sum: { totalMAD: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { shopId, createdAt: { gte: startOfMonth } },
        _sum: { totalMAD: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { shopId, paymentMethod: "COD", codPaymentStatus: "PENDING" },
        _sum: { totalMAD: true },
      }),
      this.prisma.order.aggregate({
        where: { shopId, paymentMethod: "COD", codPaymentStatus: "COLLECTED" },
        _sum: { totalMAD: true },
      }),
      this.prisma.order.aggregate({
        where: { shopId, paymentMethod: "COD", codPaymentStatus: "REMITTED" },
        _sum: { totalMAD: true },
      }),
      this.prisma.customer.findMany({
        where: { shopId },
        orderBy: [{ totalSpentMAD: "desc" }, { totalOrders: "desc" }],
        take: 3,
        select: { id: true, fullName: true, totalOrders: true, totalSpentMAD: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ["productId", "titleSnapshot"],
        where: { order: { shopId } },
        _sum: { totalMAD: true, quantity: true },
        orderBy: { _sum: { totalMAD: "desc" } },
        take: 3,
      }),
    ]);
    return {
      pendingOrders: pending,
      todayOrders: today._count,
      todayRevenueMAD: today._sum.totalMAD ?? 0,
      monthOrders: month._count,
      monthRevenueMAD: month._sum.totalMAD ?? 0,
      codPendingMAD: codPending._sum.totalMAD ?? 0,
      codCollectedMAD: codCollected._sum.totalMAD ?? 0,
      codRemittedMAD: codRemitted._sum.totalMAD ?? 0,
      freeQuotaUsed: month._count,
      freeQuotaLimit: shop?.monthlyOrderQuota ?? 20,
      plan: shop?.plan ?? "FREE",
      topCustomers,
      topProducts: topProducts.map((product) => ({
        productId: product.productId,
        title: product.titleSnapshot,
        revenueMAD: product._sum.totalMAD ?? 0,
        quantity: product._sum.quantity ?? 0,
      })),
    };
  }
}
