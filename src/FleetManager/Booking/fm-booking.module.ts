import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FMAuthModule } from '../Auth/auth.module';
import { FmBookingController } from './fm-booking.controller';
import { FmBookingService } from './fm-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookings, FleetManagerVehicles]),
    FMAuthModule,
    AuthModule,
  ],
  controllers: [FmBookingController],
  providers: [FmBookingService],
  exports: [FmBookingService],
})
export class FmBookingModule {}
