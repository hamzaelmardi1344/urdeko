import { Injectable } from "@nestjs/common";
import { verifyToken } from "@clerk/backend";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { EnvService } from "../config/env.service";

export const provisionUserInputSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .optional(),
  locale: z.enum(["fr", "ar", "darija"]).default("fr"),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  async provision(input: unknown) {
    const parsed = provisionUserInputSchema.parse(input);
    const claims = await verifyToken(parsed.token, { secretKey: this.env.get("CLERK_SECRET_KEY") });
    const clerkId = claims.sub;
    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: {
        email: parsed.email,
        fullName: parsed.fullName,
        phoneE164: parsed.phoneE164,
        locale: parsed.locale,
      },
      create: {
        clerkId,
        email: parsed.email,
        fullName: parsed.fullName,
        phoneE164: parsed.phoneE164,
        locale: parsed.locale,
      },
      include: { shop: true },
    });
    return { user };
  }

  async anonymizeAccount(userId: string): Promise<{ ok: true }> {
    const suffix = userId.slice(-8);
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.updateMany({
        where: { shop: { ownerId: userId } },
        data: {
          fullName: "Deleted customer",
          phoneE164: `+999000${suffix}`,
          addressLine: "Deleted address",
          notes: null,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${suffix}@deleted.boutique-en-poche.local`,
          phoneE164: null,
          fullName: "Deleted user",
        },
      });
    });
    return { ok: true };
  }
}
