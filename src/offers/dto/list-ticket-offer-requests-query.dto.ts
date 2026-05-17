import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export class ListTicketOfferRequestsQueryDto {
  @ApiPropertyOptional({
    enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
    default: "PENDING",
  })
  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.toUpperCase() : value)
  @IsIn(["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"])
  status?: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
}

