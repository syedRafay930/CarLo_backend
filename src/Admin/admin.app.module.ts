import { Module } from "@nestjs/common";
import { AuthModule } from './Auth/auth.module';
import { UsersModule } from './User/user.module';
import { RBACModule } from "./RBAC/rbac.module";
@Module({
  imports: [AuthModule, UsersModule, RBACModule],
})
export class AdminAppModule {}