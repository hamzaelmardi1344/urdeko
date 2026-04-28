import { Body, Controller, ForbiddenException, Get, Post, Query, Req } from "@nestjs/common";
import { z } from "zod";
import { connectInstagramInputSchema } from "@bep/shared-types";
import type { AuthenticatedRequest } from "../common/request-context";
import { InstagramService } from "./instagram.service";

const instagramImportInputSchema = z.object({
  accessToken: z.string().min(1).optional(),
});

@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly instagramService: InstagramService) {}

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
    return this.instagramService.importRecentMedia(this.shopId(request), parsed.accessToken);
  }

  private shopId(request: AuthenticatedRequest): string {
    const shopId = request.user.shopId;
    if (!shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return shopId;
  }
}
