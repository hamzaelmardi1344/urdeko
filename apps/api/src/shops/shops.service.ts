import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createShopInputSchema, updateShopInputSchema } from "@bep/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { deliveryConfigs: true, subscription: true },
    });
    if (!shop) {
      throw new NotFoundException("Shop not found");
    }
    return shop;
  }

  async createForOwner(ownerId: string, input: unknown) {
    const parsed = createShopInputSchema.parse(input);
    const existing = await this.prisma.shop.findFirst({
      where: { OR: [{ ownerId }, { slug: parsed.slug }] },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("Shop owner or slug already exists");
    }
    return this.prisma.shop.create({
      data: {
        ownerId,
        slug: parsed.slug,
        name: parsed.name,
        city: parsed.city,
        whatsappNumber: parsed.whatsappNumber,
        instagramHandle: parsed.instagramHandle,
        bio: parsed.bio,
        logoUrl: parsed.logoUrl,
        coverUrl: parsed.coverUrl,
      },
    });
  }

  async update(shopId: string, input: unknown) {
    const parsed = updateShopInputSchema.parse(input);
    if (parsed.id !== shopId) {
      throw new NotFoundException("Shop not found");
    }
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        slug: parsed.slug,
        name: parsed.name,
        city: parsed.city,
        whatsappNumber: parsed.whatsappNumber,
        instagramHandle: parsed.instagramHandle,
        bio: parsed.bio,
        logoUrl: parsed.logoUrl,
        coverUrl: parsed.coverUrl,
      },
    });
  }
}
