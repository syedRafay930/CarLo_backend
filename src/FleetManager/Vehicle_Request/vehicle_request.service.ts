import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requests } from 'src/entities/entities/Requests';
import { CreateVehicleRequestDto } from './dto/vehicle_request.dto';
import * as crypto from 'crypto';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';

@Injectable()
export class VehicleRequestService {
  constructor(
    @InjectRepository(Requests)
    private readonly vehicleRequestRepository: Repository<Requests>,
    @InjectRepository(FleetManagerVehicles)
    private readonly vehicleRepository: Repository<FleetManagerVehicles>,
    @InjectRepository(FleetManagers)
    private readonly fleetRepository: Repository<FleetManagers>,
    @InjectRepository(FleetManagerUsers)
    private readonly fleetUserRepository: Repository<FleetManagerUsers>,
  ) {}

  async createRequest(
    dto: CreateVehicleRequestDto,
    fleet_user_id: number,
    fleet_id: number,
  ) {
    if (!dto.vehicleId) {
      throw new Error('No vehicle id provided!');
    }

    if (!fleet_user_id || !fleet_id) {
      throw new Error('No fleet user id or fleet id provided!');
    }
    const rawHash = `${fleet_id}_${fleet_user_id}_${dto.vehicleId}`;
    const request_hash = crypto
      .createHash('sha256')
      .update(rawHash)
      .digest('hex');

    const existing = await this.vehicleRequestRepository.findOne({
      where: {
        requestHash: request_hash,
        requestStatus: 'pending',
        requestType: dto.requestType as Requests['requestType'],
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A similar device request is already pending. Please wait for it to be processed.',
      );
    }

    const request = this.vehicleRequestRepository.create({
      requestType: dto.requestType as Requests['requestType'],
      requestStatus: 'pending',
      title: `Request for vehicle ID ${dto.vehicleId}`,
      description: dto.message || null,
      requestHash: request_hash,
      createdAt: new Date(),
      fleet: { id: fleet_id },
      fleetUser: { id: fleet_user_id },
      vehicle: { id: dto.vehicleId },
    });
    const savedRequest = await this.vehicleRequestRepository.save(request);

    return {
      message: 'Vehicle request created successfully!',
      request_id: savedRequest.id,
    };
  }

  async getVehicleRequests(
    fleet_id: number,
    status: string,
    type: string,
    search?: string,
    fromDate?: Date,
    toDate?: Date,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
    const query = this.vehicleRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.fleetManagerVehicleDocuments', 'documents')
      .leftJoin('request.adminRespondedBy', 'admin')
      .addSelect(['admin.id', 'admin.firstName', 'admin.lastName'])
      .where('request.fleet.id = :fleet_id', { fleet_id });
    if (status) {
      query.andWhere('request.requestStatus = :status', { status });
    }

    if (type) {
      query.andWhere('request.requestType = :type', { type });
    }

    if (search) {
      query.andWhere('request.title ILIKE :search', { search: `%${search}%` });
    }

    if (fromDate) {
      query.andWhere('request.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('request.createdAt <= :toDate', { toDate });
    }

    query.orderBy('request.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Admin portal: all fleets’ requests (no fleet_id filter). */
  async getAllVehicleRequestsForAdmin(
    status?: string,
    type?: string,
    search?: string,
    fromDate?: Date,
    toDate?: Date,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const query = this.vehicleRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.fleetManagerVehicleDocuments', 'documents')
      .leftJoinAndSelect('request.fleet', 'fleet')
      .leftJoin('request.adminRespondedBy', 'admin')
      .addSelect(['admin.id', 'admin.firstName', 'admin.lastName']);

    if (status) {
      query.andWhere('request.requestStatus = :status', { status });
    }
    if (type) {
      query.andWhere('request.requestType = :type', { type });
    }
    if (search) {
      query.andWhere('request.title ILIKE :search', { search: `%${search}%` });
    }
    if (fromDate) {
      query.andWhere('request.createdAt >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('request.createdAt <= :toDate', { toDate });
    }

    query.orderBy('request.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
