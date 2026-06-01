import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@consultorio/shared';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(auth.slice(7));
      (req as Request & { user: JwtPayload }).user = payload;
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-role'] = payload.role;
      if (payload.employeeId) req.headers['x-employee-id'] = payload.employeeId;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
