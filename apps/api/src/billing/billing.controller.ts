import { Body, Controller, ForbiddenException, Headers, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
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
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    const rawBody = Buffer.from(JSON.stringify(body));
    if (!this.billingService.verifyWebhook(rawBody, signature)) {
      throw new Error("Invalid Paddle webhook signature");
    }
    return this.billingService.handleWebhook(body);
  }
}
