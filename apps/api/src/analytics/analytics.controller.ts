import { Controller, Get, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/request-context";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  summary(@Req() request: AuthenticatedRequest) {
    return this.analyticsService.summary(request.user.shopId ?? "");
  }
}
