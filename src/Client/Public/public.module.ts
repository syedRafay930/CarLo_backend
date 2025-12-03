import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicVehicleController } from './public.controller';
//import { PublicService } from './public.service';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), VehicleModule],
  controllers: [PublicVehicleController],
  //providers: [PublicService],
})
export class PublicModule {}
