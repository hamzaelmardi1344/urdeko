import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
  RawBody,
  Req,
} from "@nestjs/common";
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
    return this.notificationsService.listTemplates(this.shopId(request));
  }

  @Post("whatsapp/templates")
  updateTemplate(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.notificationsService.updateTemplate(this.shopId(request), body);
  }

  @Post("whatsapp/test-template")
  testTemplate(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.notificationsService.testTemplate(this.shopId(request), body);
  }

  @Public()
  @Get("whatsapp/webhook")
  verifyWebhook(
    @Query("hub.verify_token") token?: string,
    @Query("hub.challenge") challenge?: string,
  ) {
    if (token !== this.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN")) {
      throw new Error("Invalid WhatsApp webhook verification token");
    }
    return challenge ?? "";
  }

  @Public()
  @Post("whatsapp/webhook")
  incomingWebhook(
    @Headers("x-hub-signature-256") signature: string | undefined,
    @RawBody() rawBody: Buffer | undefined,
    @Body() body: unknown,
  ) {
    if (!rawBody) throw new Error("Raw WhatsApp webhook body is required");
    if (!this.notificationsService.verifyWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid WhatsApp webhook signature");
    }
    return this.notificationsService.handleIncomingWebhook(body);
  }

  private shopId(request: AuthenticatedRequest): string {
    const shopId = request.user.shopId;
    if (!shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return shopId;
  }
}
