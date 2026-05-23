import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventShareAction } from "@prisma/client";
import { IsEnum, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CaptureEventShareAnalyticsDto {
  @ApiProperty({
    enum: EventShareAction,
    example: EventShareAction.EVENT_SHARE_CLICKED,
  })
  @IsEnum(EventShareAction)
  eventAction!: EventShareAction;

  @ApiProperty({
    example: "mobile",
    enum: ["web", "mobile"],
  })
  @IsString()
  @MaxLength(16)
  @IsIn(["web", "mobile"])
  sourceSurface!: "web" | "mobile";

  @ApiPropertyOptional({
    example: "sess_5f87f4",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @ApiPropertyOptional({
    example: {
      slug: "campus-neon-takeover",
      target: "copy_link",
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
