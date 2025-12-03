import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagerVehicleDocuments } from 'src/entities/entities/FleetManagerVehicleDocuments';
import { VehicleDynamicPricing } from 'src/entities/entities/VehicleDynamicPricing';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMAuthModule } from '../Auth/auth.module';
import { CloudinaryModule } from 'src/Cloudinary/cloudinary.module';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagerVehicles,
      FleetManagerVehicleDocuments,
      VehicleDynamicPricing,
      VehicleRatings,
    ]),
    FMAuthModule,
    AuthModule,
    CloudinaryModule,
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
