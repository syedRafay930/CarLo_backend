import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat_message.dto';

@Controller('client/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async sendMessage(@Body() dto: ChatMessageDto) {
    const history = dto.history ?? [];
    const reply = await this.chatbotService.chat(dto.message, history);
    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'chatbot' };
  }
}
