import { Body, Controller, ForbiddenException, Headers, Post, RawBody, Req } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "../common/request-context";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout")
  checkout(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const shopId = request.user.shopId;
    if (!shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return this.billingService.createCheckout(shopId, body);
  }

  @Public()
  @Post("webhook")
  webhook(
    @Headers("paddle-signature") signature: string | undefined,
    @RawBody() rawBody: Buffer | undefined,
    @Body() body: unknown,
  ) {
    if (!rawBody) throw new Error("Raw Paddle webhook body is required");
    return this.billingService.handleWebhook(rawBody, signature, body);
  }
}
