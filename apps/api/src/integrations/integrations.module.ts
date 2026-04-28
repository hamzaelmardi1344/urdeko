import { Module } from "@nestjs/common";
import { EncryptionService } from "../common/crypto/encryption.service";
import { UploadsModule } from "../uploads/uploads.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { InstagramService } from "./instagram.service";

@Module({
  imports: [UploadsModule],
  controllers: [IntegrationsController],
  providers: [InstagramService, IntegrationsService, EncryptionService],
  exports: [InstagramService, IntegrationsService],
})
export class IntegrationsModule {}
