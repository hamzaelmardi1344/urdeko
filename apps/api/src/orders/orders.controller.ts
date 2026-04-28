import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { orderStatusSchema } from "@bep/shared-types";
import type { AuthenticatedRequest } from "../common/request-context";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query("status") status?: string) {
    const parsedStatus = status ? orderStatusSchema.parse(status) : undefined;
    return this.ordersService.list(request.user.shopId ?? "", parsedStatus);
  }

  @Get(":id")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.ordersService.get(request.user.shopId ?? "", id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.create(request.user.shopId ?? "", body);
  }

  @Post("confirm")
  confirm(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.confirm(request.user.shopId ?? "", body);
  }

  @Post("mark-prepared")
  markPrepared(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.markPrepared(request.user.shopId ?? "", body);
  }

  @Post("mark-handed-over")
  markHandedOver(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.markHandedOver(request.user.shopId ?? "", body);
  }

  @Post("mark-delivered")
  markDelivered(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.markDelivered(request.user.shopId ?? "", body);
  }

  @Post("mark-cash-remitted")
  markCashRemitted(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.markCashRemitted(request.user.shopId ?? "", body);
  }

  @Post("cancel")
  cancel(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.cancel(request.user.shopId ?? "", body);
  }

  @Post("note")
  note(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ordersService.addNote(request.user.shopId ?? "", body);
  }
}
