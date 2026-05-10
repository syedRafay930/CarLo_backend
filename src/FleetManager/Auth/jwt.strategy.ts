import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FMJwtStrategy extends PassportStrategy(Strategy, 'fm-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      fleet_email: payload.sub,
      fleet_username: payload.name,
      fleet_role: payload.role,
      fleet_user_id: payload.fleet_user_id,
      fleet_id: payload.fleet_id,
    };
  }
}
