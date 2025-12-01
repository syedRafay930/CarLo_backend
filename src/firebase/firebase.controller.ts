import { Controller, Post, Body } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';

@Controller('fcm')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('saveAdminToken')
  async saveToken(@Body() dto: SaveFcmTokenDto) {
    return await this.firebaseService.saveAdminFcmToken(dto);
  }

  @Post('saveFleetToken')
  async saveClientToken(@Body() dto: SaveFcmTokenDto) {
    return await this.firebaseService.saveFleetFcmToken(dto);
  }
}
