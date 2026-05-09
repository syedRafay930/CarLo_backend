import { Module } from '@nestjs/common';
import { AdminNotificationService } from './notification.service';
import { AdminNotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminNotifications } from 'src/entities/entities/AdminNotifications';
import { FleetRegistrationApplications } from 'src/entities/entities/FleetRegistrationApplications';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { Subscriptions } from 'src/entities/entities/Subscriptions';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import {AuthModule} from "../Auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminNotifications,
      FleetRegistrationApplications,
      FleetManagers,
      FleetManagerUsers,
      FleetManagerUsersRole,
      Subscriptions,
    ]),
    MailModule,
    AuthModule,
    FirebaseModule,
  ],
  controllers: [AdminNotificationController],
  providers: [AdminNotificationService],
})
export class NotificationModule {}
