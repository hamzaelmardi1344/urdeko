import { Body, Controller, Get, Patch, Post, Req } from "@nestjs/common";
import { AllowWithoutShop } from "../common/decorators/allow-without-shop.decorator";
import type { AuthenticatedRequest } from "../common/request-context";
import { ShopsService } from "./shops.service";

@Controller("shops")
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get("current")
  current(@Req() request: AuthenticatedRequest) {
    return this.shopsService.getCurrent(request.user.shopId ?? "");
  }

  @AllowWithoutShop()
  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.shopsService.createForOwner(request.user.id, body);
  }

  @Patch("current")
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.shopsService.update(request.user.shopId ?? "", body);
  }
}
