import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { Bookings } from 'src/entities/entities/Bookings';
import { Users } from 'src/entities/entities/Users';
import { BookingModule } from 'src/Client/Booking/booking.module';
import { ClientAuthModule } from 'src/Client/Auth/auth.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotGraphService } from './chatbot-graph.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagerVehicles,
      FleetManagers,
      Bookings,
      Users,
    ]),
    forwardRef(() => BookingModule),
    ClientAuthModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotGraphService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
