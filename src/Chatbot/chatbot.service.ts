import { Injectable, Logger } from '@nestjs/common';
import { ChatbotGraphService } from './chatbot-graph.service';
import type { ChatHistoryTurn } from './graph/chat-state';
import { GeocodingService } from './location/geocoding.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly chatbotGraph: ChatbotGraphService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async chat(
    userMessage: string,
    userEmail: string | undefined,
    conversationHistory: Array<{
      role: 'user' | 'assistant' | 'model';
      content: string;
    }>,
    coords?: { lat: number; lng: number },
  ): Promise<string> {
    const normalizedHistory: ChatHistoryTurn[] = (conversationHistory ?? []).map(
      (h) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      }),
    );

    let userCity: string | null = null;
    if (
      coords?.lat != null &&
      coords?.lng != null &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng)
    ) {
      userCity = await this.geocodingService.reverseGeocode(
        coords.lat,
        coords.lng,
      );
    }

    try {
      return await this.chatbotGraph.invoke({
        userMessage,
        userEmail,
        conversationHistory: normalizedHistory,
        userCity,
      });
    } catch (err) {
      this.logger.warn(
        `Chatbot invoke failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'Sorry — CarLo Assistant is having a moment. Please try again in a little while.';
    }
  }
}
