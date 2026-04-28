import { SetMetadata } from "@nestjs/common";

export const ALLOW_WITHOUT_SHOP_KEY = "bep:allow-without-shop";
export const AllowWithoutShop = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_WITHOUT_SHOP_KEY, true);
