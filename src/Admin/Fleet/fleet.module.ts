import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { FleetManagersDocuments } from 'src/entities/entities/FleetManagersDocuments';
import { AuthModule } from '../Auth/auth.module';
import { MailModule } from 'src/Nodemailer/mailer.module';
import { CloudinaryModule } from 'src/Cloudinary/cloudinary.module';
import { CloudinaryProvider } from 'src/Cloudinary/cloudinary.provider';
import { VehicleModule } from 'src/FleetManager/Vehicle/vehicle.module';
import { VehicleRequestModule } from 'src/FleetManager/Vehicle_Request/vehicle_request.module';
import { FleetRegistrationApplications } from 'src/entities/entities/FleetRegistrationApplications';
import { Subscriptions } from 'src/entities/entities/Subscriptions';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetManagers,
      FleetManagerUsers,
      FleetManagerUsersRole,
      FleetManagersDocuments,
      FleetRegistrationApplications,
      Subscriptions,
    ]),
    AuthModule,
    MailModule,
    FirebaseModule,
    forwardRef(() => VehicleModule),
    forwardRef(() => VehicleRequestModule),
  ],
  controllers: [FleetController],
  providers: [FleetService, CloudinaryProvider],
  exports: [FleetService],
})
export class FleetModule {}
