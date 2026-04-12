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
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminFcmTokens,
      FleetFcmTokens,
      AdminNotifications
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const envPath =
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
          process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
        const serviceAccountPath = envPath
          ? path.isAbsolute(envPath)
            ? envPath
            : path.join(process.cwd(), envPath)
          : path.join(
              __dirname,
              '../../config/carlo-447920-service-account.json',
            );

        if (!fs.existsSync(serviceAccountPath)) {
          console.warn(
            '[Firebase] Service account JSON not found — FCM push disabled (local dev OK). Set FIREBASE_SERVICE_ACCOUNT_PATH or add JSON at config/.',
          );
          return null;
        }

        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8'),
        );

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      },
    },
    FirebaseService,
  ],
  controllers: [FirebaseController],
  exports: [FirebaseService, TypeOrmModule],
})
export class FirebaseModule {}
