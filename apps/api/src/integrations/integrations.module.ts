import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { InstagramService } from "./instagram.service";

@Module({
  controllers: [IntegrationsController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class IntegrationsModule {}
