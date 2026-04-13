import { Injectable, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService implements OnModuleInit {
  private genAI: GoogleGenerativeAI | null = null;
  /** Override with GEMINI_MODEL if your key does not serve the default. */
  private readonly modelName =
    process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

  onModuleInit() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[GeminiService] GEMINI_API_KEY not set — chatbot disabled');
      return;
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  /**
   * Gemini chat sessions require `history` to start with role `user`, not `model`.
   * Clients often prepend a local assistant greeting — strip leading `model` turns.
   * History must end with `model` (or be empty) before `sendMessage(nextUser)`;
   * strip a trailing orphan `user` (e.g. after a failed reply omitted from history).
   */
  private normalizeChatHistory(
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>,
  ): Array<{ role: 'user' | 'model'; content: string }> {
    const h = conversationHistory.filter((m) => (m.content ?? '').trim().length > 0);
    let start = 0;
    while (start < h.length && h[start].role === 'model') {
      start++;
    }
    let end = h.length;
    while (end > start && h[end - 1].role === 'user') {
      end--;
    }
    return h.slice(start, end);
  }

  async generateResponse(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string,
  ): Promise<string> {
    if (!this.genAI) {
      return 'Chatbot is currently unavailable. Please try again later.';
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt,
      });

      const normalized = this.normalizeChatHistory(conversationHistory);
      const history = normalized.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      const text = response.text();
      return text?.trim() || 'Sorry, I could not generate a reply. Please try again.';
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[GeminiService] Error:', msg);
      if (msg.includes('API_KEY') || msg.includes('API key')) {
        return 'Invalid API key. Please contact support.';
      }
      return 'Sorry, I am having trouble responding right now. Please try again.';
    }
  }
}
