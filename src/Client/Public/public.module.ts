import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicVehicleController } from './public.controller';
//import { PublicService } from './public.service';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';
import { ClientAuthModule } from '../Auth/auth.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    VehicleModule,
    AuthModule,
    ClientAuthModule,
  ],
  controllers: [PublicVehicleController],
  //providers: [PublicService],
})
export class PublicModule {}
