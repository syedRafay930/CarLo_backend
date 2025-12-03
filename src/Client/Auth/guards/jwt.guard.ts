import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/Admin/Auth/redis.service';

@Injectable()
export class ClientJwtAuthGuard extends AuthGuard('client-jwt') {}

// Custom guard with blacklist check
@Injectable()
export class ClientJwtBlacklistGuard extends ClientJwtAuthGuard {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization;
    if (!authHeader) throw new UnauthorizedException('No Authorization header');

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Invalid token format');

    const isBlacklisted = await this.redisService.getValue(
      `blacklist:${token}`,
    );
    if (isBlacklisted) throw new UnauthorizedException('Token is blacklisted');

    return super.canActivate(context) as Promise<boolean>;
  }
}
