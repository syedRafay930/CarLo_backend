import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat_message.dto';
import { JwtGuard } from 'src/Client/Auth/guards/jwt.guard';

@Controller('client/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @UseGuards(JwtGuard)
  @Post('message')
  async sendMessage(@Body() dto: ChatMessageDto, @Req() req: { user?: { client_email?: string } }) {
    const history = dto.history ?? [];
    const userEmail =
      req.user?.client_email?.trim() ?? undefined;
    const coords =
      dto.lat != null && dto.lng != null
        ? { lat: dto.lat, lng: dto.lng }
        : undefined;
    const reply = await this.chatbotService.chat(
      dto.message,
      userEmail,
      history,
      coords,
    );
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
