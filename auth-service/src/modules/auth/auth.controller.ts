import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@consultorio/shared';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('auth/me')
  async me(@Headers('x-user-id') userId?: string, @Headers('authorization') auth?: string) {
    let id = userId;
    if (!id && auth?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(
          auth.slice(7),
          { secret: this.config.get('JWT_SECRET') },
        );
        id = payload.sub;
      } catch {
        throw new UnauthorizedException();
      }
    }
    if (!id) throw new UnauthorizedException();
    return this.authService.getMe(id);
  }
}
