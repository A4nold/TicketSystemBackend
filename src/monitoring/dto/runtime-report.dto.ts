import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class RuntimeReportDto {
  @ApiProperty({
    example: "frontend",
    enum: ["backend", "frontend", "mobile"],
  })
  @IsString()
  @IsIn(["backend", "frontend", "mobile"])
  surface!: "backend" | "frontend" | "mobile";

  @ApiProperty({
    example: "web-global-error",
  })
  @IsString()
  @MaxLength(120)
  type!: string;

  @ApiProperty({
    example: "Rendered more hooks than during the previous render.",
  })
  @IsString()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    example: "/wallet",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  route?: string;

  @ApiPropertyOptional({
    example: "CheckoutReturnStatus",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  component?: string;

  @ApiPropertyOptional({
    example: "Error: Example stack",
  })
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  stack?: string;

  @ApiPropertyOptional({
    example: {
      orderId: "ord_123",
      ticketSerial: "CNT-GA-0001",
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
