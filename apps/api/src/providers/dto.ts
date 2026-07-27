import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from "class-validator";
import type { ProviderRouteRules, StoragePoolMode } from "@storagepk/contracts";

export class DriveLinkIntentDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requestedScopes?: string[];
}

export class TelegramProviderDto {
  @IsString()
  label!: string;

  @IsString()
  botToken!: string;

  @IsString()
  destinationChatId!: string;

  @IsIn(["public_bot_api", "local_bot_api"])
  mode!: "public_bot_api" | "local_bot_api";

  @IsOptional()
  @IsUrl({ require_tld: false })
  localBaseUrl?: string;

  @IsBoolean()
  acknowledgedPrivacyModel!: boolean;
}

export class CreateStoragePoolDto {
  @IsString()
  name!: string;

  @IsIn(["fill_first", "balanced", "rule_based", "failover", "replicated", "archive"])
  mode!: StoragePoolMode;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  accounts!: PoolAccountDto[];
}

export class PoolAccountDto {
  @IsString()
  providerAccountId!: string;

  @IsInt()
  @Min(1)
  priority!: number;

  @IsIn(["primary", "overflow", "archive", "replica", "manual"])
  role!: "primary" | "overflow" | "archive" | "replica" | "manual";

  @IsOptional()
  @IsInt()
  quotaThresholdPercent?: number;

  @IsOptional()
  rules?: ProviderRouteRules;
}

export class RouteSimulationDto {
  @IsString()
  filename!: string;

  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  folderPath?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classificationLabels?: string[];
}
