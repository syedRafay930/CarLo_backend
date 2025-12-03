import { Module } from "@nestjs/common";
import { VehicleModule } from "./Vehicle/vehicle.module";
import { FMUsersModule } from "./User/user.module";
import { FMAuthModule } from "./Auth/auth.module";
import { VehicleRequestModule } from "./Vehicle_Request/vehicle_request.module";
@Module({
  imports: [VehicleModule, FMUsersModule, FMAuthModule, VehicleRequestModule],
})
export class FleetManagerAppModule {}