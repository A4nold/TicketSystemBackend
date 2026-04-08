import { Module } from "@nestjs/common";

import { ResaleController } from "./resale.controller";
import { ResaleService } from "./resale.service";

@Module({
  controllers: [ResaleController],
  providers: [ResaleService],
})
export class ResaleModule {}
