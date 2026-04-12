import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtBlacklistGuard } from 'src/Admin/Auth/guards/jwt.guard';
import { AllocationService } from './allocation.service';
import { AllocationRequestDto } from './dto/allocation_request.dto';

@Controller('client/allocation')
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  @Post('recommend')
  async getRecommendations(@Body() dto: AllocationRequestDto) {
    return this.allocationService.getRecommendations(dto);
  }

  @Get('stats')
  @UseGuards(JwtBlacklistGuard)
  async getAllocationStats() {
    return this.allocationService.getStats();
  }
}
