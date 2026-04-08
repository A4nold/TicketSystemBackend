import { ApiProperty } from "@nestjs/swagger";

export class ApiRootResponseDto {
  @ApiProperty({ example: "Private Event Smart Ticketing API" })
  name!: string;

  @ApiProperty({ example: "1.0.0" })
  version!: string;

  @ApiProperty({ example: "/docs" })
  docsUrl!: string;

  @ApiProperty({
    example: ["/api/health", "/api/events", "/api/events/:slug"],
    type: [String],
  })
  routes!: string[];
}
