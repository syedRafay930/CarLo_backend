import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminFcmTokens } from 'src/entities/entities/AdminFcmTokens';
import { FleetFcmTokens } from 'src/entities/entities/FleetFcmTokens';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import * as path from 'path';
import * as fs from 'fs';
import { forwardRef } from '@nestjs/common';
import { FirebaseController } from './firebase.controller';
import { AdminNotifications } from 'src/entities/entities/AdminNotifications';
import { UsersModule } from 'src/Admin/User/user.module';
import { FleetManagerNotifications } from 'src/entities/entities/FleetManagerNotifications';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminFcmTokens,
      FleetFcmTokens,
      FleetManagerNotifications,
      AdminNotifications,
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccountPath = path.join(
          __dirname,
          '../../config/carlo-26172-firebase-adminsdk-fbsvc-aa9f235756.json',
        );

        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8'),
        );

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
    },
    FirebaseService,
  ],
  controllers: [FirebaseController],
  exports: [FirebaseService, TypeOrmModule],
})
export class FirebaseModule {}
