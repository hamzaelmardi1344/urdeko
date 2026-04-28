import { Body, Controller, Get, Headers, Post, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedRequest } from "../common/request-context";
import { Public } from "../common/decorators/public.decorator";
import { EnvService } from "../config/env.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly env: EnvService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("whatsapp/templates")
  templates(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.listTemplates(request.user.shopId ?? "");
  }

  @Post("whatsapp/templates")
  updateTemplate(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.notificationsService.updateTemplate(request.user.shopId ?? "", body);
  }

  @Public()
  @Get("whatsapp/webhook")
  verifyWebhook(@Query("hub.verify_token") token?: string, @Query("hub.challenge") challenge?: string) {
    if (token !== this.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN")) {
      throw new Error("Invalid WhatsApp webhook verification token");
    }
    return challenge ?? "";
  }

  @Public()
  @Post("whatsapp/webhook")
  incomingWebhook(
    @Req() request: FastifyRequest,
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Body() body: unknown,
  ) {
    const rawBody = Buffer.from(JSON.stringify(body));
    if (!this.notificationsService.verifyWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid WhatsApp webhook signature");
    }
    return this.notificationsService.handleIncomingWebhook(body);
  }
}
