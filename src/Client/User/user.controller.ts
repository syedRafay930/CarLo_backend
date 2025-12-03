import {
  Controller,
  Put,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  Param,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientUsersService } from './user.service';
import { UpdateProfileDto } from './dto/update_profile.dto';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';

@Controller('client/profile')
export class ClientUsersController {
  constructor(private readonly clientService: ClientUsersService) {}

  @UseGuards(ClientJwtBlacklistGuard)
  @Patch()
  @UseInterceptors(FileInterceptor('profile_pic'))
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const clientId = req.user.client_id;
    const updatedUser = await this.clientService.updateUserProfile(
      clientId,
      updateProfileDto,
      file,
    );

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('mark-favorite/:vehicleId')
  async markAsFavorite(@Req() req: any, @Param('vehicleId') vehicleId: number) {
    const clientId = req.user.client_id;
    return this.clientService.markAsFavorite(clientId, vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Delete('unmark-favorite/:vehicleId')
  async unmarkAsFavorite(
    @Req() req: any,
    @Param('vehicleId') vehicleId: number,
  ) {
    const clientId = req.user.client_id;
    return this.clientService.unmarkAsFavorite(clientId, vehicleId);
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('favorite-vehicles')
  async getFavoriteVehicles(
    @Req() req: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
    @Query('sortOrder') sortOrder: 'DESC',
  ) {
    const clientId = req.user.client_id;

    return this.clientService.getFavoriteVehicles(
      clientId,
      page,
      limit,
      search,
      sortOrder,
    );
  }
}
