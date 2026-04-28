import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/request-context";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.customersService.list(request.user.shopId ?? "");
  }

  @Get(":id")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.customersService.get(request.user.shopId ?? "", id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.customersService.create(request.user.shopId ?? "", body);
  }

  @Patch()
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.customersService.update(request.user.shopId ?? "", body);
  }
}
