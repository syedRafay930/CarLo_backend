import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllocationModule } from 'src/Allocation/allocation.module';
import { AnalyticsModule } from 'src/Analytics/analytics.module';
import { ChatbotModule } from 'src/Chatbot/chatbot.module';
import { ClientAuthModule } from 'src/Client/Auth/auth.module';
import { BookingModule } from 'src/Client/Booking/booking.module';
import { HostModule } from 'src/Client/Host/host.module';
import { PublicModule } from 'src/Client/Public/public.module';
import { ClientNotificationsModule } from 'src/Client/client-notifications/client-notifications.module';
import { ClientUsersModule } from 'src/Client/User/user.module';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { UserFavoriteVehicles } from 'src/entities/entities/UserFavoriteVehicles';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';
import { OcrModule } from 'src/OCR/ocr.module';
import { FlutterController } from './flutter.controller';
import { OptionalClientJwtGuard } from './guards/optional-client-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserFavoriteVehicles,
      FleetManagerVehicles,
      VehicleRatings,
    ]),
    ClientAuthModule,
    VehicleModule,
    PublicModule,
    ClientUsersModule,
    AnalyticsModule,
    BookingModule,
    ClientNotificationsModule,
    ChatbotModule,
    AllocationModule,
    FirebaseModule,
    HostModule,
    OcrModule,
  ],
  controllers: [FlutterController],
  providers: [OptionalClientJwtGuard],
})
export class FlutterModule {}
