import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  calculateOrderTotals,
  canCreateOrderForPlan,
  storefrontCheckoutInputSchema,
} from "@bep/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: "PUBLISHED" },
          orderBy: { updatedAt: "desc" },
          include: { images: { orderBy: { position: "asc" } }, variants: true },
        },
      },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    return { shop, products: shop.products };
  }

  async checkout(input: unknown) {
    const parsed = storefrontCheckoutInputSchema.parse(input);
    const shop = await this.prisma.shop.findUnique({ where: { slug: parsed.shopSlug } });
    if (!shop) throw new NotFoundException("Shop not found");
    await this.assertMonthlyQuota(shop.id);
    const customer = await this.prisma.customer.upsert({
      where: { shopId_phoneE164: { shopId: shop.id, phoneE164: parsed.customer.phoneE164 } },
      update: {
        fullName: parsed.customer.fullName,
        city: parsed.customer.city,
        addressLine: parsed.customer.addressLine,
        notes: parsed.customer.notes,
      },
      create: {
        shopId: shop.id,
        fullName: parsed.customer.fullName,
        phoneE164: parsed.customer.phoneE164,
        city: parsed.customer.city,
        addressLine: parsed.customer.addressLine,
        notes: parsed.customer.notes,
      },
    });
    const products = await this.prisma.product.findMany({
      where: { shopId: shop.id, id: { in: parsed.items.map((item) => item.productId) } },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true },
    });
    const orderItems = parsed.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) throw new NotFoundException("Product not found");
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
      discountMAD: 0,
    });
    const order = await this.prisma.order.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        reference: this.createReference(),
        paymentMethod: "COD",
        source: parsed.source,
        codPaymentStatus: "PENDING",
        subtotalMAD: totals.subtotalMAD,
        deliveryMAD: parsed.deliveryMAD,
        discountMAD: 0,
        totalMAD: totals.totalMAD,
        items: { create: orderItems },
        events: { create: { type: "CREATED" } },
      },
      include: { items: true },
    });
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: { increment: 1 },
        totalSpentMAD: { increment: order.totalMAD },
      },
    });
    return { reference: order.reference, totalMAD: order.totalMAD };
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
