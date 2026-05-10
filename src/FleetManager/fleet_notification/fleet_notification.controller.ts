import { Controller } from '@nestjs/common';
import { FleetNotificationService } from './fleet_notification.service';

@Controller('fleet-notification')
export class FleetNotificationController {
  constructor(private readonly fleetNotificationService: FleetNotificationService) {}
}
