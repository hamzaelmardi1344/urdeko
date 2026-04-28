import { Module } from "@nestjs/common";
import { EncryptionService } from "../common/crypto/encryption.service";
import { IntegrationsController } from "./integrations.controller";
import { InstagramService } from "./instagram.service";

@Module({
  controllers: [IntegrationsController],
  providers: [InstagramService, EncryptionService],
  exports: [InstagramService],
})
export class IntegrationsModule {}
