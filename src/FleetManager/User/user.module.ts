import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FMUsersService } from './user.service';
//import { UsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { FMAuthModule } from '../Auth/auth.module';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { AuthModule } from 'src/Admin/Auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([FleetManagerUsers, FleetManagerUsersRole]),
    JwtModule.register({}),
    RedisModule,
    MailModule,
    AuthModule,
    forwardRef(() => FMAuthModule),
  ],
  providers: [FMUsersService],
  exports: [FMUsersService, TypeOrmModule],
  //controllers: [UsersController],
})
export class FMUsersModule {}
