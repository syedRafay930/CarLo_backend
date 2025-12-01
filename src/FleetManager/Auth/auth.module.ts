import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FMAuthService } from './auth.service';
import { FMAuthController } from './auth.controller';
import { FMUsersModule } from '../User/user.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMJwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FM_RBACModule } from '../RBAC/rbac.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([FleetManagerUsers]),
    MailModule,
    AuthModule,
    forwardRef(() => FM_RBACModule),
    forwardRef(() => FMUsersModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        //signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '20m' },
      }),
    }),
  ],
  providers: [FMAuthService, FMJwtStrategy],
  controllers: [FMAuthController],
  exports: [JwtModule, FMAuthService, FMJwtStrategy],
})
export class FMAuthModule {}
