import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createProductInputSchema, updateProductInputSchema } from "@bep/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.product.findMany({
      where: { shopId },
      orderBy: { updatedAt: "desc" },
      include: { images: { orderBy: { position: "asc" } }, variants: true },
    });
  }

  async get(shopId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
      include: { images: { orderBy: { position: "asc" } }, variants: true },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  create(shopId: string, input: unknown) {
    const parsed = createProductInputSchema.parse(input);
    return this.prisma.product.create({
      data: {
        shopId,
        title: parsed.title,
        titleAr: parsed.titleAr,
        description: parsed.description,
        descriptionAr: parsed.descriptionAr,
        descriptionDarija: parsed.descriptionDarija,
        priceMAD: parsed.priceMAD,
        comparePriceMAD: parsed.comparePriceMAD,
        stock: parsed.stock,
        unlimited: parsed.unlimited,
        status: parsed.status,
        sourceInstagramPostId: parsed.sourceInstagramPostId,
        aiGenerated: parsed.aiGenerated,
        images: { create: parsed.images },
        variants: { create: parsed.variants },
      },
      include: { images: true, variants: true },
    });
  }

  async update(shopId: string, input: unknown) {
    const parsed = updateProductInputSchema.parse(input);
    await this.assertOwnership(shopId, parsed.id);
    return this.prisma.product.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        titleAr: parsed.titleAr,
        description: parsed.description,
        descriptionAr: parsed.descriptionAr,
        descriptionDarija: parsed.descriptionDarija,
        priceMAD: parsed.priceMAD,
        comparePriceMAD: parsed.comparePriceMAD,
        stock: parsed.stock,
        unlimited: parsed.unlimited,
        status: parsed.status,
        sourceInstagramPostId: parsed.sourceInstagramPostId,
        aiGenerated: parsed.aiGenerated,
        images: parsed.images
          ? {
              deleteMany: {},
              create: parsed.images,
            }
          : undefined,
        variants: parsed.variants
          ? {
              deleteMany: {},
              create: parsed.variants,
            }
          : undefined,
      },
      include: { images: true, variants: true },
    });
  }

  async delete(shopId: string, productId: string): Promise<{ ok: true }> {
    await this.assertOwnership(shopId, productId);
    await this.prisma.product.update({
      where: { id: productId },
      data: { status: "ARCHIVED" },
    });
    return { ok: true };
  }

  private async assertOwnership(shopId: string, productId: string): Promise<void> {
    const count = await this.prisma.product.count({ where: { id: productId, shopId } });
    if (count !== 1) {
      throw new ForbiddenException("Product does not belong to shop");
    }
  }
}
