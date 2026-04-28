import { Injectable, NotFoundException } from "@nestjs/common";
import { createCustomerInputSchema, updateCustomerInputSchema } from "@bep/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.customer.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(shopId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId },
      include: { orders: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return {
      ...customer,
      segment: this.segment(customer.totalOrders, customer.totalSpentMAD, customer.createdAt),
    };
  }

  create(shopId: string, input: unknown) {
    const parsed = createCustomerInputSchema.parse(input);
    return this.prisma.customer.upsert({
      where: { shopId_phoneE164: { shopId, phoneE164: parsed.phoneE164 } },
      update: {
        fullName: parsed.fullName,
        city: parsed.city,
        addressLine: parsed.addressLine,
        notes: parsed.notes,
      },
      create: {
        shopId,
        fullName: parsed.fullName,
        phoneE164: parsed.phoneE164,
        city: parsed.city,
        addressLine: parsed.addressLine,
        notes: parsed.notes,
      },
    });
  }

  async update(shopId: string, input: unknown) {
    const parsed = updateCustomerInputSchema.parse(input);
    await this.get(shopId, parsed.id);
    return this.prisma.customer.update({
      where: { id: parsed.id },
      data: {
        fullName: parsed.fullName,
        phoneE164: parsed.phoneE164,
        city: parsed.city,
        addressLine: parsed.addressLine,
        notes: parsed.notes,
      },
    });
  }

  private segment(totalOrders: number, totalSpentMAD: number, createdAt: Date): string {
    const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
    if (totalSpentMAD >= 100_000 || totalOrders >= 5) {
      return "VIP";
    }
    if (totalOrders >= 2) {
      return "LOYAL";
    }
    if (ageDays <= 30) {
      return "NEW";
    }
    return "DORMANT";
  }
}
