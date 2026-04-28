import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { StorefrontService } from "./storefront.service";

@Public()
@Controller("storefront")
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.storefrontService.getBySlug(slug);
  }

  @Post("checkout")
  checkout(@Body() body: unknown) {
    return this.storefrontService.checkout(body);
  }
}
