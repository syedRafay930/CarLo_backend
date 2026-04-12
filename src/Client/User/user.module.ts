import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientUsersService } from './user.service';
import { ClientUsersController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { Users } from 'src/entities/entities/Users';
import { UserFavoriteVehicles } from 'src/entities/entities/UserFavoriteVehicles';


@Module({
  imports: [
    TypeOrmModule.forFeature([Users, UserFavoriteVehicles]),
    JwtModule.register({}),
    MailModule,
    AuthModule,
  ],
  providers: [ClientUsersService],
  exports: [ClientUsersService, TypeOrmModule],
  controllers: [ClientUsersController],
})
export class ClientUsersModule {}
