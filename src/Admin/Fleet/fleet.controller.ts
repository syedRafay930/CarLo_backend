import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Body,
  Put,
  Patch,
  Param,
  Req,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { JwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { FleetService } from './fleet.service';
import { AddFleetDto } from './dto/add_fleet.dto';
import { AddFleetUserDto } from './dto/add_fleet_user.dto';
import { AddFleetWithUserDto } from './dto/add_fleet_with_admin.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { UploadedFiles } from '@nestjs/common';
import { UploadDocumentsDto } from './dto/upload_documents.dto';

@Controller('admin/fleet')
export class FleetController {
  constructor(private fleetService: FleetService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('add')
  async AddFleetWithUser(@Body() dto: AddFleetWithUserDto) {
    const { fleet, user } = await this.fleetService.addFleetWithUser(dto);
    await this.fleetService.generateJwtTokenAndResetLink(
      dto.user.Email,
      dto.fleet.fleet_name,
    );
    return {
      message: 'Fleet created successfully',
      fleet,
      user,
    };
  }

  // @UseGuards(JwtBlacklistGuard)
  // @Post('uploadDocuments/:fleetManagerId')
  // @UseInterceptors(FilesInterceptor('files'))
  // async uploadDocuments(
  //   @Param('fleetManagerId') fleetManagerId: number,
  //   @UploadedFiles() files: Express.Multer.File[],
  //   @Body() body: UploadDocumentsDto,
  // ) {
  //   if (!files || !files.length) {
  //     throw new BadRequestException('At least one file is required');
  //   }

  //   if (body.documentTypes.length !== files.length) {
  //     throw new BadRequestException('documentTypes length must match files length');
  //   }

  //   return this.fleetService.uploadDocuments(fleetManagerId,files,body.documentTypes);
  // }
  @UseGuards(JwtBlacklistGuard)
  @Post('uploadDocuments/:fleetManagerId')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadDocuments(
    @Param('fleetManagerId') fleetManagerId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDocumentsDto,
  ) {
      if (!files || !files.length) {
      throw new BadRequestException('At least one file is required');
    }

    if (body.documentTypes.length !== files.length) {
      throw new BadRequestException(
        'documentTypes length must match files length',
      );
    }

    return this.fleetService.uploadDocuments(
      fleetManagerId,
      files,
      body.documentTypes,
    );
  }
}
