import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  calculateOrderTotals,
  canTransitionOrder,
  createOrderInputSchema,
  orderActionInputSchema,
  type OrderStatus,
} from "@bep/shared-types";
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
    return this.prisma.order.create({
      data: {
        shopId,
        customerId: parsed.customerId,
        reference: this.createReference(),
        paymentMethod: parsed.paymentMethod,
        subtotalMAD: totals.subtotalMAD,
        deliveryMAD: parsed.deliveryMAD,
        discountMAD: parsed.discountMAD,
        totalMAD: totals.totalMAD,
        items: { create: orderItems },
        events: { create: { type: "CREATED" } },
      },
      include: { customer: true, items: true, events: true },
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
    return this.transition(shopId, input, "DELIVERED", "DELIVERED");
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

  private async transition(
    shopId: string,
    input: unknown,
    status: OrderStatus,
    eventType: "CONFIRMED" | "PREPARED" | "HANDED_OVER" | "DELIVERED" | "CANCELLED",
  ) {
    const parsed = orderActionInputSchema.parse(input);
    const order = await this.get(shopId, parsed.orderId);
    if (!canTransitionOrder(order.status, status)) {
      throw new BadRequestException(`Cannot transition order from ${order.status} to ${status}`);
    }
    return this.prisma.order.update({
      where: { id: parsed.orderId },
      data: {
        status,
        events: { create: { type: eventType, meta: parsed.note ? { note: parsed.note } : undefined } },
      },
      include: { customer: true, items: true, events: true, delivery: true },
    });
  }

  private createReference(): string {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
    return `BEP-${new Date().getFullYear()}-${random}`;
  }
}
