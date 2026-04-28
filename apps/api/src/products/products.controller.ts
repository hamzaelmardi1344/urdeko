import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/request-context";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.productsService.list(request.user.shopId ?? "");
  }

  @Get(":id")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.productsService.get(request.user.shopId ?? "", id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.productsService.create(request.user.shopId ?? "", body);
  }

  @Patch()
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.productsService.update(request.user.shopId ?? "", body);
  }

  @Delete(":id")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.productsService.delete(request.user.shopId ?? "", id);
  }
}
