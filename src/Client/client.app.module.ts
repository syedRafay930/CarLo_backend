import { Module } from "@nestjs/common";
import { ClientAuthModule } from "./Auth/auth.module";
import { ClientUsersModule } from "./User/user.module";
import { PublicModule } from "./Public/public.module";


@Module({
  imports: [ClientAuthModule, ClientUsersModule, PublicModule],
})
export class ClientAppModule {}