import { Body, Controller, Delete, Post, Req } from "@nestjs/common";
import { AllowWithoutShop } from "../common/decorators/allow-without-shop.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("provision")
  provision(@Body() body: unknown) {
    return this.authService.provision(body);
  }

  @AllowWithoutShop()
  @Delete("me")
  deleteMe(@Req() request: AuthenticatedRequest) {
    return this.authService.anonymizeAccount(request.user.id);
  }
}
