import { Global, Module } from "@nestjs/common";

import { QrTokensService } from "./qr-tokens.service";

@Global()
@Module({
  providers: [QrTokensService],
  exports: [QrTokensService],
})
export class QrTokensModule {}
