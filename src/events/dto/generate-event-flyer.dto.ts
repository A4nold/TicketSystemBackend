import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class GenerateEventFlyerDto {
  @ApiProperty({
    enum: ["4x5", "A4", "9x16"],
    example: "4x5",
  })
  @IsIn(["4x5", "A4", "9x16"])
  size!: "4x5" | "A4" | "9x16";
}

