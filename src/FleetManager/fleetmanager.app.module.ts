import { Module } from "@nestjs/common";
import { VehicleModule } from "./Vehicle/vehicle.module";
@Module({
  imports: [VehicleModule],
})
export class FleetManagerAppModule {}