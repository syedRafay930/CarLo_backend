import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../Auth/auth.module';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { Admin } from 'src/entities/entities/Admin';
import { AdminRole } from 'src/entities/entities/AdminRole';
@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminRole]),
    JwtModule.register({}),
    MailModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController],
})
export class UsersModule {}
