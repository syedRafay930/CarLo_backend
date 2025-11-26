import { Module } from "@nestjs/common";
import { VehicleModule } from "./Vehicle/vehicle.module";
import { FMUsersModule } from "./User/user.module";
import { FMAuthModule } from "./Auth/auth.module";
@Module({
  imports: [VehicleModule, FMUsersModule, FMAuthModule],
})
export class FleetManagerAppModule {}