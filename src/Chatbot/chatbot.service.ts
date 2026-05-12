import { Injectable } from '@nestjs/common';
import { ChatbotGraphService } from './chatbot-graph.service';
import type { ChatHistoryTurn } from './graph/chat-state';

@Injectable()
export class ChatbotService {
  constructor(private readonly chatbotGraph: ChatbotGraphService) {}

  async chat(
    userMessage: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant' | 'model';
      content: string;
    }>,
    userEmail?: string,
  ): Promise<string> {
    const normalizedHistory: ChatHistoryTurn[] = (conversationHistory ?? []).map(
      (h) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      }),
    );

    try {
      return await this.chatbotGraph.invoke({
        userMessage,
        userEmail,
        conversationHistory: normalizedHistory,
      });
    } catch {
      return 'Sorry — CarLo Assistant is having a moment. Please try again in a little while.';
    }
  }
}
