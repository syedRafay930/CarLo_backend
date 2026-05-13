import { Module } from '@nestjs/common';
import { ClientNotificationsService } from './client-notifications.service';
import { ClientNotificationsController } from './client-notifications.controller';
import { ClientNotifications } from 'src/entities/entities/ClientNotifications';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  imports: [TypeOrmModule.forFeature([ClientNotifications])],
  controllers: [ClientNotificationsController],
  providers: [ClientNotificationsService],
  exports: [ClientNotificationsService],
})
export class ClientNotificationsModule {}
