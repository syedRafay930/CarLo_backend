import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientAuthService } from './auth.service';
import { ClientAuthController } from './auth.controller';
import { ClientUsersModule } from '../User/user.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { ClientJwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([FleetManagerUsers]),
    MailModule,
    AuthModule,
    forwardRef(() => ClientUsersModule),
    forwardRef(() => FirebaseModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        //signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '20m' },
      }),
    }),
  ],
  providers: [ClientAuthService, ClientJwtStrategy],
  controllers: [ClientAuthController],
  exports: [JwtModule, ClientAuthService, ClientJwtStrategy],
})
export class ClientAuthModule {}
