import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { GeminiService } from './gemini.service';
import { RagService } from './rag.service';

@Module({
  imports: [TypeOrmModule.forFeature([FleetManagerVehicles, FleetManagers])],
  controllers: [ChatbotController],
  providers: [ChatbotService, GeminiService, RagService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
