import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken } from "@clerk/backend";
import type { FastifyRequest } from "fastify";
import { EnvService } from "../../config/env.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PUBLIC_ROUTE_KEY } from "../decorators/public.decorator";
import type { AuthenticatedRequest } from "../request-context";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const claims = await verifyToken(token, {
      secretKey: this.env.get("CLERK_SECRET_KEY"),
    });
    const clerkId = claims.sub;
    if (!clerkId) {
      throw new UnauthorizedException("Invalid Clerk session");
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { shop: true },
    });
    if (!user || !user.shop) {
      if (!user) {
        throw new UnauthorizedException("User is not provisioned");
      }
    }

    request.user = {
      id: user.id,
      clerkId,
      email: user.email,
      shopId: user.shop?.id ?? null,
    };
    return true;
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return null;
    }
    return authorization.slice("Bearer ".length);
  }
}
