import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscriptions } from 'src/entities/entities/Subscriptions';
import { FleetManagerSubscriptions } from 'src/entities/entities/FleetManagerSubscriptions';

import { Requests } from 'src/entities/entities/Requests';
import { AdminNotifications } from 'src/entities/entities/AdminNotifications';
import { FleetNotifications } from 'src/entities/entities/FleetNotifications';
import { AdminFcmTokens } from 'src/entities/entities/AdminFcmTokens';
import { FleetFcmTokens } from 'src/entities/entities/FleetFcmTokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscriptions,
      FleetManagerSubscriptions,
      Requests,
      AdminNotifications,
      AdminFcmTokens,
      FleetFcmTokens,
      FleetNotifications,
    ]),
  ],
  //controllers: [FleetController],
  //providers: [FleetService],
})
export class SubscriptionModule {}
