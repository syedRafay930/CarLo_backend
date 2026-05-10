import { Module } from '@nestjs/common';
import { VehicleModule } from './Vehicle/vehicle.module';
import { FMUsersModule } from './User/user.module';
import { FMAuthModule } from './Auth/auth.module';
import { VehicleRequestModule } from './Vehicle_Request/vehicle_request.module';
import { FmBookingModule } from './Booking/fm-booking.module';
@Module({
  imports: [
    VehicleModule,
    FMUsersModule,
    FMAuthModule,
    VehicleRequestModule,
    FmBookingModule,
  ],
})
export class FleetManagerAppModule {}
