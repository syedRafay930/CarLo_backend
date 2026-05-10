import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleRequestController } from './vehicle_request.controller';
import { VehicleRequestService } from './vehicle_request.service';
import { Requests } from 'src/entities/entities/Requests';
import { VehicleModule } from '../Vehicle/vehicle.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { FleetModule } from 'src/Admin/Fleet/fleet.module';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMAuthModule } from '../Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Requests,
      FleetManagerVehicles,
      FleetManagers,
      FleetManagerUsers,
    ]),
    forwardRef(() => VehicleModule),
    forwardRef(() => FirebaseModule),
    forwardRef(() => FleetModule),
    FMAuthModule,
    AuthModule,
  ],
  controllers: [VehicleRequestController],
  providers: [VehicleRequestService],
  exports: [VehicleRequestService],
})
export class VehicleRequestModule {}
