import { Body, Controller, ForbiddenException, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/request-context";
import { UploadsService } from "./uploads.service";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("product-image")
  productImage(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const shopId = request.user.shopId;
    if (!shopId) {
      throw new ForbiddenException("Authenticated shop context is required");
    }
    return this.uploadsService.createProductImageUpload(shopId, body);
  }
}
