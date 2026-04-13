import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { Transactions } from 'src/entities/entities/Transactions';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { Users } from 'src/entities/entities/Users';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMAuthModule } from 'src/FleetManager/Auth/auth.module';
import { AnalyticsService } from './analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { FmAnalyticsController } from './fm-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bookings,
      Transactions,
      FleetManagerVehicles,
      FleetManagers,
      Users,
    ]),
    AuthModule,
    FMAuthModule,
  ],
  controllers: [AdminAnalyticsController, FmAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
