import { Module } from "@nestjs/common";
import { AuthModule } from './Auth/auth.module';
import { UsersModule } from './User/user.module';
@Module({
  imports: [AuthModule, UsersModule],
})
export class AdminAppModule {}