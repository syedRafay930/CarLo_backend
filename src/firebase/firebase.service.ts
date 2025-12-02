import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { AdminFcmTokens } from 'src/entities/entities/AdminFcmTokens';
import { FleetFcmTokens } from 'src/entities/entities/FleetFcmTokens';

import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
@Injectable()
export class FirebaseService {
  constructor(
    @InjectRepository(AdminFcmTokens)
    private readonly adminfcmRepo: Repository<AdminFcmTokens>,

    @InjectRepository(FleetFcmTokens)
    private readonly fleetfcmRepo: Repository<FleetFcmTokens>,
  ) {}

  async saveAdminFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.adminfcmRepo.findOne({
      where: { token: dto.token },
    });

    if (existing) {
      existing.admin.id = dto.user_id;  
      existing.platform = dto.platform as 'web' | 'android' | 'ios';
      existing.isActive = true;
      existing.updatedAt = new Date();
      return await this.adminfcmRepo.save(existing);
    }

    const saved = this.adminfcmRepo.create({
      admin: {id: dto.user_id},
      token: dto.token,
      platform: dto.platform as 'web' | 'android' | 'ios',
      isActive: true,
      createdAt: new Date(),
    });

    return await this.adminfcmRepo.save(saved);
  }

  async saveFleetFcmToken(dto: SaveFcmTokenDto) {
    const existing = await this.fleetfcmRepo.findOne({
      where: { token: dto.token },
    });

    if (existing) {
      existing.fleetUser.id = dto.user_id;
      existing.platform = dto.platform as 'web' | 'android' | 'ios';
      existing.isActive = true;
      existing.updatedAt = new Date();
      return await this.fleetfcmRepo.save(existing);
    }

    const saved = this.fleetfcmRepo.create({
      fleetUser: {id: dto.user_id},
      token: dto.token,
      platform: dto.platform as 'web' | 'android' | 'ios',
      isActive: true,
      createdAt: new Date(),
    });

    return await this.fleetfcmRepo.save(saved);
  }

  async deleteAdminFcmToken( admin_id: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.adminfcmRepo.findOne({ where: { admin: {id: admin_id} } });
    if (!existing) {
      return { success: false, message: 'Token not found' };
    }
    await this.adminfcmRepo.remove(existing);
    return { success: true, message: 'Token deleted successfully' };
  }

  async deleteClientFcmToken(admin_id: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.fleetfcmRepo.findOne({ where: { fleetUser: {id: admin_id} } });
    if (!existing) {
      return { success: false, message: 'Token not found' };
    }
    await this.fleetfcmRepo.remove(existing);
    return { success: true, message: 'Token deleted successfully' };
  }
}