import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "ticketsystem-api" })
  service!: string;
}
