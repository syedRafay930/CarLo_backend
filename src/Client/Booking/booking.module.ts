import { forwardRef, Module } from '@nestjs/common';
//import { BookingService } from "./booking.service";
//import { BookingController } from "./booking.controller";
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Users } from 'src/entities/entities/Users';
import { ClientUsersModule } from '../User/user.module';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookings, FleetManagerVehicles, Users]),
    forwardRef(() => ClientUsersModule),
    forwardRef(() => VehicleModule),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class BookingModule {}
