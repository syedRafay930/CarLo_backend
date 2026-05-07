import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { HostService } from './host.service';
import { BecomeHostDto } from './dto/become_host.dto';
import { CreateVehicleDto } from 'src/FleetManager/Vehicle/dto/create_vehicle.dto';
import { UploadVehicleDocumentsDto } from 'src/FleetManager/Vehicle/dto/upload_vehicle_documents.dto';

@Controller('client')
@UseGuards(ClientJwtBlacklistGuard)
export class HostController {
  constructor(private readonly hostService: HostService) {}

  private clientId(req: { user?: { client_id?: number } }): number {
    const id = req.user?.client_id;
    if (id == null || Number.isNaN(Number(id))) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('host-status')
  async hostStatus(@Req() req: { user?: { client_id?: number } }) {
    return this.hostService.getHostStatus(this.clientId(req));
  }

  @Post('become-host')
  async becomeHost(
    @Req() req: { user?: { client_id?: number } },
    @Body() dto: BecomeHostDto,
  ) {
    return this.hostService.becomeHost(this.clientId(req), dto);
  }

  @Post('host/add-vehicle')
  async addVehicle(
    @Req() req: { user?: { client_id?: number } },
    @Body() dto: CreateVehicleDto,
  ) {
    const vehicle = await this.hostService.addHostVehicle(
      this.clientId(req),
      dto,
    );
    return { message: 'Vehicle added successfully', vehicle: vehicle };
  }

  @Get('host/my-vehicles')
  async myVehicles(@Req() req: { user?: { client_id?: number } }) {
    return this.hostService.getMyHostVehicles(this.clientId(req));
  }

  @Post('host/vehicles/:vehicleId/upload-docs')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadDocs(
    @Req() req: { user?: { client_id?: number } },
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadVehicleDocumentsDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'At least one file is required to upload documents.',
      );
    }
    if (body.documentTypes.length !== files.length) {
      throw new BadRequestException(
        'documentTypes length must match files length',
      );
    }
    const details = await this.hostService.uploadHostVehicleDocs(
      this.clientId(req),
      vehicleId,
      files,
      body.documentTypes,
    );
    return { message: 'Documents uploaded successfully', details };
  }
}
