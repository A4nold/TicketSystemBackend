import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class RegisterPushDeviceDto {
  @ApiProperty({
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsString()
  @Matches(/^ExponentPushToken\[[^\]]+\]$/, {
    message: "expoPushToken must be a valid Expo push token.",
  })
  expoPushToken!: string;

  @ApiProperty({
    enum: ["IOS", "ANDROID"],
  })
  @IsEnum({ IOS: "IOS", ANDROID: "ANDROID" })
  platform!: "IOS" | "ANDROID";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

export class UnregisterPushDeviceDto {
  @ApiProperty({
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsString()
  @Matches(/^ExponentPushToken\[[^\]]+\]$/, {
    message: "expoPushToken must be a valid Expo push token.",
  })
  expoPushToken!: string;
}
