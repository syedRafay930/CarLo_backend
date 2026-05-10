import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Admin } from 'src/entities/entities/Admin';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Users } from 'src/entities/entities/Users';
import { VehicleService } from 'src/FleetManager/Vehicle/vehicle.service';
import { CreateVehicleDto } from 'src/FleetManager/Vehicle/dto/create_vehicle.dto';
import { BecomeHostDto } from './dto/become_host.dto';

@Injectable()
export class HostService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(FleetManagers)
    private readonly fleetRepo: Repository<FleetManagers>,
    @InjectRepository(FleetManagerUsers)
    private readonly fmUserRepo: Repository<FleetManagerUsers>,
    @InjectRepository(FleetManagerUsersRole)
    private readonly fmRoleRepo: Repository<FleetManagerUsersRole>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(FleetManagerVehicles)
    private readonly vehiclesRepo: Repository<FleetManagerVehicles>,
    private readonly vehicleService: VehicleService,
  ) {}

  private async requireHostContext(clientId: number) {
    const fleet = await this.fleetRepo.findOne({
      where: { clientOwner: { id: clientId }, isDelete: false },
    });
    if (!fleet) {
      throw new ForbiddenException('You are not registered as a host');
    }
    const fmUser = await this.fmUserRepo.findOne({
      where: { fleetManager: { id: fleet.id }, isDelete: false },
      order: { id: 'ASC' },
    });
    if (!fmUser) {
      throw new ForbiddenException('Host account is not fully set up');
    }
    return { fleetId: fleet.id, fmUserId: fmUser.id, fleet };
  }

  async getHostStatus(clientId: number) {
    const fleet = await this.fleetRepo.findOne({
      where: { clientOwner: { id: clientId }, isDelete: false },
    });
    if (!fleet) {
      return { isHost: false, fleet: null, fmUser: null };
    }
    const fmUser = await this.fmUserRepo.findOne({
      where: { fleetManager: { id: fleet.id }, isDelete: false },
      relations: ['fmUsersRole'],
      order: { id: 'ASC' },
    });
    return {
      isHost: true,
      fleet: {
        id: fleet.id,
        name: fleet.name,
        type: fleet.type,
        city: fleet.city,
        country: fleet.country,
        email: fleet.email,
      },
      fmUser: fmUser
        ? {
            id: fmUser.id,
            email: fmUser.email,
            firstName: fmUser.firstName,
            lastName: fmUser.lastName,
            roleName: fmUser.fmUsersRole?.roleName ?? null,
          }
        : null,
    };
  }

  async becomeHost(clientId: number, dto: BecomeHostDto) {
    const existing = await this.fleetRepo.findOne({
      where: { clientOwner: { id: clientId } },
    });
    if (existing) {
      throw new ConflictException('You already have a host fleet');
    }

    const user = await this.usersRepo.findOne({ where: { id: clientId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'Your account has no password set; reset your password on CarLo, then try again.',
      );
    }
    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException(
        'Password does not match your CarLo account. Use the same password you use to sign in here.',
      );
    }
    const fmPasswordHash = await bcrypt.hash(dto.password, 12);

    const admin = await this.adminRepo.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    const fleetName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      'My Fleet';

    const fleet = this.fleetRepo.create({
      name: `${fleetName} (Host)`,
      type: 'individual',
      email: user.email?.slice(0, 50) ?? null,
      contact: dto.contactNumber.slice(0, 20),
      city: dto.city.slice(0, 50),
      country: dto.country.slice(0, 50),
      address: dto.address.slice(0, 255),
      isActive: true,
      isDelete: false,
      clientOwner: { id: clientId },
      ...(admin
        ? {
            createdBy: { id: admin.id },
            updatedBy: { id: admin.id },
          }
        : {}),
    });
    const savedFleet = await this.fleetRepo.save(fleet);

    const role = this.fmRoleRepo.create({
      roleName: 'Admin',
      fleetManager: { id: savedFleet.id },
      createdAt: new Date(),
    });
    const savedRole = await this.fmRoleRepo.save(role);

    const fmUserEntity = this.fmUserRepo.create({
      fleetManager: { id: savedFleet.id },
      fmUsersRole: { id: savedRole.id },
      email: user.email ?? '',
      password: fmPasswordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      contact: dto.contactNumber.slice(0, 20),
      isActive: true,
      isDelete: false,
      isFirstlogin: false,
    });
    const savedFmUser = await this.fmUserRepo.save(fmUserEntity);

    return {
      message:
        'Host fleet created. Sign in to the Fleet Manager portal with the same email and password as your CarLo account.',
      fleetId: savedFleet.id,
      fleetManagerUserId: savedFmUser.id,
      email: user.email,
    };
  }

  async addHostVehicle(clientId: number, dto: CreateVehicleDto) {
    const { fleetId, fmUserId } = await this.requireHostContext(clientId);
    return this.vehicleService.createVehicle(fmUserId, fleetId, dto);
  }

  async getMyHostVehicles(clientId: number) {
    const { fleetId } = await this.requireHostContext(clientId);
    return this.vehiclesRepo.find({
      where: { fleetManager: { id: fleetId }, isDeleted: false },
      order: { id: 'DESC' },
    });
  }

  async assertHostOwnsVehicle(clientId: number, vehicleId: number) {
    const { fleetId } = await this.requireHostContext(clientId);
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: vehicleId, fleetManager: { id: fleetId } },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async uploadHostVehicleDocs(
    clientId: number,
    vehicleId: number,
    files: Express.Multer.File[],
    documentTypes: string[],
  ) {
    await this.assertHostOwnsVehicle(clientId, vehicleId);
    return this.vehicleService.uploadVehicleDocuments(
      vehicleId,
      files,
      documentTypes,
    );
  }
}
