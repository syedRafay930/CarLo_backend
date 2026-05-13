import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicVehicleController } from './public.controller';
import { PublicService } from './public.service';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';
import { ClientAuthModule } from '../Auth/auth.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetModule } from 'src/Admin/Fleet/fleet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FleetManagers]),
    VehicleModule,
    AuthModule,
    FleetModule,
    ClientAuthModule,
  ],
  controllers: [PublicVehicleController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
