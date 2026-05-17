import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateTicketOfferRequestDto {
  @ApiProperty({
    example: "35.00",
  })
  @IsString()
  offeredPrice!: string;
}

