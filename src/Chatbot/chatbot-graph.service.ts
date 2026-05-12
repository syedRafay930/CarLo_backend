import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Bookings } from 'src/entities/entities/Bookings';
import { Users } from 'src/entities/entities/Users';
import { BookingService } from 'src/Client/Booking/booking.service';
import FAQ_CONTENT from './faq';
import {
  buildChatbotGraph,
  BuildChatbotGraphOptions,
} from './graph/chatbot.graph';
import { type ChatHistoryTurn } from './graph/chat-state';

@Injectable()
export class ChatbotGraphService {
  private graph: ReturnType<typeof buildChatbotGraph> | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FleetManagerVehicles)
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(Bookings)
    private readonly bookingRepo: Repository<Bookings>,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
  ) {}

  private ensureGraph(): ReturnType<typeof buildChatbotGraph> | null {
    if (this.graph) {
      return this.graph;
    }
    const key = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!key) {
      return null;
    }
    const opts: BuildChatbotGraphOptions = {
      openAIApiKey: key,
      faqContent: FAQ_CONTENT,
      vehicleRepo: this.vehicleRepo,
      bookingRepo: this.bookingRepo,
      usersRepo: this.usersRepo,
      bookingService: this.bookingService,
    };
    this.graph = buildChatbotGraph(opts);
    return this.graph;
  }

  async invoke(params: {
    userMessage: string;
    userEmail?: string;
    conversationHistory: ChatHistoryTurn[];
    userCity?: string | null;
  }): Promise<string> {
    const graph = this.ensureGraph();
    if (!graph) {
      return 'CarLo Assistant is not configured yet (missing OPENAI_API_KEY). Please contact support.';
    }

    const result = await graph.invoke({
      userMessage: params.userMessage,
      userEmail: params.userEmail?.trim() ?? '',
      conversationHistory: params.conversationHistory,
      userCity: params.userCity ?? null,
      intent: '',
      toolKey: 'none',
      toolInput: {},
      toolOutput: undefined,
      missingFields: [],
      finalResponse: '',
    });

    return typeof result.finalResponse === 'string'
      ? result.finalResponse
      : '';
  }
}
