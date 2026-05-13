import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/entities/Admin';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Users } from 'src/entities/entities/Users';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';
import { ClientAuthModule } from '../Auth/auth.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { HostController } from './host.controller';
import { HostService } from './host.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      FleetManagers,
      FleetManagerUsers,
      FleetManagerUsersRole,
      Admin,
      FleetManagerVehicles,
    ]),
    VehicleModule,
    AuthModule,
    ClientAuthModule,
  ],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
