import { Module } from "@nestjs/common";
import { AuthModule } from './Auth/auth.module';
import { UsersModule } from './User/user.module';
import { RBACModule } from "./RBAC/rbac.module";
import { FleetModule } from "./Fleet/fleet.module";
import { SubscriptionModule } from "./Subscription/subscription.module";
@Module({
  imports: [AuthModule, UsersModule, RBACModule, FleetModule, SubscriptionModule],
})
export class AdminAppModule {}