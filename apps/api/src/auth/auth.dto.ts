import { IsIn, IsOptional, IsString, IsEmail, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(["web", "desktop"])
  clientType?: "web" | "desktop";
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;

  @IsOptional()
  @IsIn(["web", "desktop"])
  clientType?: "web" | "desktop";
}
