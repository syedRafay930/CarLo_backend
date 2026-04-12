import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagerVehicles,
      VehicleRatings,
      Bookings,
    ]),
  ],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
