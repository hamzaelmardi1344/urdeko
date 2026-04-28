import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/request-context";
import { Public } from "../common/decorators/public.decorator";
import { DeliveryService } from "./delivery.service";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post("configure")
  configure(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.deliveryService.configure(request.user.shopId ?? "", body);
  }

  @Post("assign")
  assign(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.deliveryService.assign(request.user.shopId ?? "", body);
  }

  @Public()
  @Post("webhooks/:provider")
  webhook(@Param("provider") provider: string, @Body() body: unknown) {
    return this.deliveryService.handleWebhook(provider, body);
  }
}
