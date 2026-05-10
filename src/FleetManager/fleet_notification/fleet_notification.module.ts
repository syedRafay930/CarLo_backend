import { Module } from '@nestjs/common';
import { FleetNotificationService } from './fleet_notification.service';
import { FleetNotificationController } from './fleet_notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerNotifications } from 'src/entities/entities/FleetManagerNotifications';

@Module({
  imports: [TypeOrmModule.forFeature([FleetManagerNotifications])],
  controllers: [FleetNotificationController],
  providers: [FleetNotificationService],
})
export class FleetNotificationModule {}
