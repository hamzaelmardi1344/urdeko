import { Body, Controller, Post, Req } from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../common/request-context";
import { InstagramService } from "./instagram.service";

const instagramImportInputSchema = z.object({
  accessToken: z.string().min(1),
});

@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post("instagram/import")
  importInstagram(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = instagramImportInputSchema.parse(body);
    return this.instagramService.importRecentMedia(request.user.shopId ?? "", parsed.accessToken);
  }
}
