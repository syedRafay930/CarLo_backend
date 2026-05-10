import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { VehicleDynamicPricing } from 'src/entities/entities/VehicleDynamicPricing';
import { Bookings } from 'src/entities/entities/Bookings';
import { FMAuthModule } from 'src/FleetManager/Auth/auth.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { DynamicPricingController } from './dynamic-pricing.controller';
import { DynamicPricingService } from './dynamic-pricing.service';
import { PricingEngineService } from './pricing-engine.service';
import { PricingCronService } from './pricing-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagerVehicles,
      VehicleDynamicPricing,
      Bookings,
    ]),
    FMAuthModule,
    AuthModule,
  ],
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService, PricingEngineService, PricingCronService],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
