import { Module } from '@nestjs/common';
import { FmNotificationService } from './fleet_notification.service';
import { FmNotificationController } from './fleet_notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerNotifications } from 'src/entities/entities/FleetManagerNotifications';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { AuthModule } from 'src/Admin/Auth/auth.module';
import { FMAuthModule } from '../Auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FleetManagerNotifications]), FirebaseModule, AuthModule, FMAuthModule],
  controllers: [FmNotificationController],
  providers: [FmNotificationService],
})
export class FleetNotificationModule {}
