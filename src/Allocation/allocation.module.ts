import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/Admin/Auth/auth.module';
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
    AuthModule,
  ],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
