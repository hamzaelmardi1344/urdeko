import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ALLOW_WITHOUT_SHOP_KEY } from "../decorators/allow-without-shop.decorator";
import { PUBLIC_ROUTE_KEY } from "../decorators/public.decorator";
import type { AuthenticatedRequest } from "../request-context";

@Injectable()
export class ShopGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowWithoutShop = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_SHOP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || allowWithoutShop) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return true;
  }
}
