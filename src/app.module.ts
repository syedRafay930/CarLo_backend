import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminAppModule } from './Admin/admin.app.module';
import { MailModule } from './Nodemailer/mailer.module';
import { CloudinaryModule } from './Cloudinary/cloudinary.module';
import { FleetManagerAppModule } from './FleetManager/fleetmanager.app.module';
import { ClientAppModule } from './Client/client.app.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ChatbotModule } from './Chatbot/chatbot.module';
import { AllocationModule } from './Allocation/allocation.module';
import { DynamicPricingModule } from './DynamicPricing/dynamic-pricing.module';
import { OcrModule } from './OCR/ocr.module';
import { AnalyticsModule } from './Analytics/analytics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, 
      },
      autoLoadEntities: true,
      synchronize: false, 
    }),

    AdminAppModule,
    MailModule,
    CloudinaryModule,
    FleetManagerAppModule,
    FirebaseModule,
    ClientAppModule,
    ChatbotModule,
    AllocationModule,
    DynamicPricingModule,
    OcrModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
