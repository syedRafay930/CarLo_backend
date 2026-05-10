import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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

const firebaseModuleLogger = new Logger('FirebaseModule');

function resolveCredentialsPath(config: ConfigService): string | null {
  const raw =
    config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH')?.trim() ||
    config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();
  if (!raw) {
    return null;
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminFcmTokens,
      FleetFcmTokens,
      AdminNotifications,
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const serviceAccountPath = resolveCredentialsPath(config);
        if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
          firebaseModuleLogger.warn(
            serviceAccountPath
              ? `FCM disabled — credentials file not found: ${serviceAccountPath}`
              : 'FCM disabled — set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS',
          );
          return null;
        }

        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8'),
        ) as admin.ServiceAccount;

        if (admin.apps.length > 0) {
          return admin.app();
        }

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
