import { Body, Controller, Post, HttpCode, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./auth.dto";
import { AccessTokenGuard } from "./access-token.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password, body.clientType ?? "web");
  }

  @Post("refresh")
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken, body.clientType ?? "web");
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(AccessTokenGuard)
  async logout(@Body() body: RefreshDto) {
    await this.auth.revoke(body.refreshToken);
  }
}
