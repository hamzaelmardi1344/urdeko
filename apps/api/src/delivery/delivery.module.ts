import { Module } from "@nestjs/common";
import { EncryptionService } from "../common/crypto/encryption.service";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService, EncryptionService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
