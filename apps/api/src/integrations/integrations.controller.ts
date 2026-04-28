import { Body, Controller, ForbiddenException, Get, Post, Query, Req } from "@nestjs/common";
import { connectInstagramInputSchema, instagramImportInputSchema } from "@bep/shared-types";
import type { AuthenticatedRequest } from "../common/request-context";
import { IntegrationsService } from "./integrations.service";
import { InstagramService } from "./instagram.service";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly instagramService: InstagramService,
  ) {}

  @Get("status")
  status(@Req() request: AuthenticatedRequest) {
    return this.integrationsService.status(this.shopId(request));
  }

  @Post("r2/verify")
  verifyR2() {
    return this.integrationsService.verifyR2();
  }

  @Get("instagram/oauth-url")
  instagramOAuthUrl(
    @Req() request: AuthenticatedRequest,
    @Query("redirectUri") redirectUri?: string,
  ) {
    return this.instagramService.createOAuthUrl(this.shopId(request), redirectUri);
  }

  @Post("instagram/connect")
  connectInstagram(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.instagramService.connect(
      this.shopId(request),
      connectInstagramInputSchema.parse(body),
    );
  }

  @Post("instagram/import")
  importInstagram(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = instagramImportInputSchema.parse(body);
    return this.instagramService.importRecentMedia(this.shopId(request), parsed);
  }

  private shopId(request: AuthenticatedRequest): string {
    const shopId = request.user.shopId;
    if (!shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return shopId;
  }
}
