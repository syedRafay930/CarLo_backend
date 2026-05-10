import { Module } from '@nestjs/common';
import { ClientAuthModule } from './Auth/auth.module';
import { ClientUsersModule } from './User/user.module';
import { PublicModule } from './Public/public.module';
import { BookingModule } from 'src/Client/Booking/booking.module';
import { HostModule } from './Host/host.module';

@Module({
  imports: [
    ClientAuthModule,
    ClientUsersModule,
    PublicModule,
    BookingModule,
    HostModule,
  ],
})
export class ClientAppModule {}
