import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  calculateOrderTotals,
  canCreateOrderForPlan,
  canTransitionOrder,
  createOrderInputSchema,
  orderActionInputSchema,
  type OrderStatus,
} from "@bep/shared-types";
import { Prisma } from "../../prisma/generated/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: { shopId, status },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: true,
        delivery: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async get(shopId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: {
        customer: true,
        items: true,
        delivery: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  async create(shopId: string, input: unknown) {
    const parsed = createOrderInputSchema.parse(input);
    await this.assertMonthlyQuota(shopId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: parsed.customerId, shopId },
      select: { id: true },
    });
    if (!customer) {
      throw new ForbiddenException("Customer does not belong to shop");
    }
    const products = await this.prisma.product.findMany({
      where: { shopId, id: { in: parsed.items.map((item) => item.productId) } },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true },
    });
    const orderItems = parsed.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        throw new ForbiddenException("Product does not belong to shop");
      }
      const variant = item.variantId
        ? product.variants.find((candidate) => candidate.id === item.variantId)
        : undefined;
      const unitPriceMAD = variant?.priceMAD ?? product.priceMAD;
      return {
        productId: product.id,
        variantId: variant?.id,
        titleSnapshot: variant ? `${product.title} - ${variant.name}` : product.title,
        imageUrlSnapshot: product.images[0]?.url,
        unitPriceMAD,
        quantity: item.quantity,
        totalMAD: unitPriceMAD * item.quantity,
      };
    });
    const totals = calculateOrderTotals({
      items: orderItems,
      deliveryMAD: parsed.deliveryMAD,
      discountMAD: parsed.discountMAD,
    });
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          shopId,
          customerId: parsed.customerId,
          reference: this.createReference(),
          paymentMethod: parsed.paymentMethod,
          source: parsed.source,
          codPaymentStatus: parsed.paymentMethod === "COD" ? "PENDING" : "NOT_APPLICABLE",
          subtotalMAD: totals.subtotalMAD,
          deliveryMAD: parsed.deliveryMAD,
          discountMAD: parsed.discountMAD,
          totalMAD: totals.totalMAD,
          items: { create: orderItems },
          events: { create: { type: "CREATED", meta: { source: parsed.source } } },
        },
        include: { customer: true, items: true, events: true, delivery: true },
      });
      await tx.customer.update({
        where: { id: parsed.customerId },
        data: { totalOrders: { increment: 1 }, totalSpentMAD: { increment: order.totalMAD } },
      });
      return order;
    });
  }

  async confirm(shopId: string, input: unknown) {
    return this.transition(shopId, input, "CONFIRMED", "CONFIRMED");
  }

  async markPrepared(shopId: string, input: unknown) {
    return this.transition(shopId, input, "PREPARING", "PREPARED");
  }

  async markHandedOver(shopId: string, input: unknown) {
    return this.transition(shopId, input, "HANDED_OVER", "HANDED_OVER");
  }

  async markDelivered(shopId: string, input: unknown) {
    const parsed = orderActionInputSchema.parse(input);
    const order = await this.get(shopId, parsed.orderId);
    if (!canTransitionOrder(order.status, "DELIVERED")) {
      throw new BadRequestException(`Cannot transition order from ${order.status} to DELIVERED`);
    }
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      if (order.delivery) {
        await tx.delivery.update({
          where: { orderId: order.id },
          data: {
            deliveredAt: now,
            cashCollectedMAD: order.paymentMethod === "COD" ? order.totalMAD : null,
            status: "delivered",
          },
        });
      }
      return tx.order.update({
        where: { id: parsed.orderId },
        data: {
          status: "DELIVERED",
          codPaymentStatus: order.paymentMethod === "COD" ? "COLLECTED" : "NOT_APPLICABLE",
          events: {
            create: { type: "DELIVERED", meta: parsed.note ? { note: parsed.note } : undefined },
          },
        },
        include: { customer: true, items: true, events: true, delivery: true },
      });
    });
  }

  async cancel(shopId: string, input: unknown) {
    return this.transition(shopId, input, "CANCELLED", "CANCELLED");
  }

  async addNote(shopId: string, input: unknown) {
    const parsed = orderActionInputSchema.parse(input);
    await this.get(shopId, parsed.orderId);
    return this.prisma.orderEvent.create({
      data: { orderId: parsed.orderId, type: "NOTE_ADDED", meta: { note: parsed.note ?? "" } },
    });
  }

  async markCashRemitted(shopId: string, input: unknown) {
    const parsed = orderActionInputSchema.parse(input);
    const order = await this.get(shopId, parsed.orderId);
    if (order.paymentMethod !== "COD") {
      throw new BadRequestException("Cash remittance applies only to COD orders");
    }
    if (order.codPaymentStatus !== "COLLECTED") {
      throw new BadRequestException("COD cash must be collected before it can be marked remitted");
    }
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.delivery.upsert({
        where: { orderId: order.id },
        update: { cashRemittedAt: now, cashCollectedMAD: order.totalMAD, status: "cash_remitted" },
        create: {
          orderId: order.id,
          provider: "MANUAL",
          status: "cash_remitted",
          cashCollectedMAD: order.totalMAD,
          cashRemittedAt: now,
        },
      });
      return tx.order.update({
        where: { id: order.id },
        data: {
          codPaymentStatus: "REMITTED",
          events: {
            create: {
              type: "NOTE_ADDED",
              meta: { cashStatus: "REMITTED", note: parsed.note ?? "COD cash remitted" },
            },
          },
        },
        include: { customer: true, items: true, events: true, delivery: true },
      });
    });
  }

  private async transition(
    shopId: string,
    input: unknown,
    status: OrderStatus,
    eventType: "CONFIRMED" | "PREPARED" | "HANDED_OVER" | "DELIVERED" | "CANCELLED",
    extraData?: Prisma.OrderUpdateInput,
  ) {
    const parsed = orderActionInputSchema.parse(input);
    const order = await this.get(shopId, parsed.orderId);
    if (!canTransitionOrder(order.status, status)) {
      throw new BadRequestException(`Cannot transition order from ${order.status} to ${status}`);
    }
    return this.prisma.order.update({
      where: { id: parsed.orderId },
      data: {
        ...extraData,
        status,
        events: {
          create: { type: eventType, meta: parsed.note ? { note: parsed.note } : undefined },
        },
      },
      include: { customer: true, items: true, events: true, delivery: true },
    });
  }

  private createReference(): string {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
    return `BEP-${new Date().getFullYear()}-${random}`;
  }

  private async assertMonthlyQuota(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { plan: true, monthlyOrderQuota: true },
    });
    if (!shop) {
      throw new NotFoundException("Shop not found");
    }
    const now = new Date();
    const ordersThisMonth = await this.prisma.order.count({
      where: { shopId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    });
    if (!canCreateOrderForPlan({ ...shop, ordersThisMonth })) {
      throw new ForbiddenException("Free plan monthly order quota reached");
    }
  }
}
