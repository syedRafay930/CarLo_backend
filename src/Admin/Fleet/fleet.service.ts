import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, Between } from 'typeorm';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { FleetManagersDocuments } from 'src/entities/entities/FleetManagersDocuments';
import { AddFleetDto } from './dto/add_fleet.dto';
import { AddFleetUserDto } from './dto/add_fleet_user.dto';
import { AddFleetWithUserDto } from './dto/add_fleet_with_admin.dto';
import { RedisService } from '../Auth/redis.service';
import { MailService } from 'src/Nodemailer/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AddRoleDto } from '../RBAC/dto/add_adminRole.dto';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { EditFleetDto } from './dto/edit_fleet_.dto';
import { get } from 'http';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(FleetManagers)
    private fleetRepository: Repository<FleetManagers>,
    @InjectRepository(FleetManagerUsers)
    private fleetUserRepository: Repository<FleetManagerUsers>,
    @InjectRepository(FleetManagerUsersRole)
    private fleetUserRoleRepository: Repository<FleetManagerUsersRole>,
    @InjectRepository(FleetManagersDocuments)
    private fleetDocumentRepository: Repository<FleetManagersDocuments>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
    private dataSource: DataSource,
  ) {}


  async getFleetById(fleetId: number){
    const fleet = await this.fleetRepository.findOne({
      where: { id: fleetId },
    });
    return fleet;
  }

  async addFleetWithUser(dto: AddFleetWithUserDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const existingFleet = await this.fleetRepository.findOne({
        where: [
          { email: dto.fleet.fleet_email },
          { name: dto.fleet.fleet_name },
          { contact: dto.fleet.fleet_contact },
          { regNumber: dto.fleet.fleet_registration_number },
        ],
      });

      if (existingFleet) {
        throw new UnauthorizedException('Fleet already exists');
      }

      const existingUser = await this.fleetUserRepository.findOne({
        where: [
          { email: dto.user.Email },
          { contact: dto.user.Contact },
          { cnic: dto.user.Cnic },
        ],
      });

      if (existingUser) {
        throw new UnauthorizedException(
          'User with given username, email, contact, or CNIC already exists',
        );
      }

      const fleet = this.fleetRepository.create({
        name: dto.fleet.fleet_name,
        contact: dto.fleet.fleet_contact,
        email: dto.fleet.fleet_email,
        regNumber: dto.fleet.fleet_registration_number,
        type: dto.fleet.fleet_type,
        createdAt: new Date(),
        address: dto.fleet?.fleet_address,
        // subscription: dto.company.subscription,
        isActive: false,
        isDelete: false,
      }) as FleetManagers;
      const savedFleet = await queryRunner.manager.save(fleet);

      const role = await this.fleetUserRoleRepository.findOne({
        where: { roleName: dto.user.Role },
      });

      if (!role) {
        throw new UnauthorizedException('Role not found');
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const fleetUser = this.fleetUserRepository.create({
        firstName: dto.user.first_name,
        lastName: dto.user.last_name,
        email: dto.user.Email,
        contact: dto.user.Contact,
        cnic: dto.user.Cnic,
        password: hashedPassword,
        fmUsersRole: { id: role.id },
        fleetManager: { id: savedFleet.id },
        createdAt: new Date(),
        invitedAt: new Date(),
        isFirstlogin: true,
        isActive: false,
        isDelete: false,
      }) as FleetManagerUsers;
      const savedFleetUser = await queryRunner.manager.save(fleetUser);
      await queryRunner.commitTransaction();
      return {
        fleet: fleetUser,
        user: {
          first_name: savedFleetUser.firstName,
          last_name: savedFleetUser.lastName,
          email: savedFleetUser.email,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        error?.message || 'Failed to create company with user',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async generateJwtTokenAndResetLink(email: string, companyName: string) {
    const user = await this.fleetUserRepository.findOne({
      where: { email: email },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.firstName) {
      throw new UnauthorizedException('User first name not found');
    }
    if (!user.email) {
      throw new UnauthorizedException('User email not available');
    }
    const token = this.jwtService.sign(
      { sub: user.email },
      {
        secret: this.configService.get<string>('RESET_SECRET'),
        expiresIn: '5m',
      },
    );

    await this.redisService.setValue(`forgot:${token}`, user.email, 300); // 5 mins

    const resetLink = `http://localhost:5173/resetPassword/token=${token}`;

    await this.mailService.sendTemplatedMail(
      user.email,
      'Welcome to CarLo!',
      'fleet_invitation',
      {
        username: user.firstName,
        companyName: companyName,
        useremail: user.email,
        resetLink: resetLink,
      },
    );

    return {
      message: 'JWT token and reset link generated successfully',
      email,
    };
  }

  async uploadDocuments(
    fleetManagerId: number,
    files: Express.Multer.File[],
    documentTypes: string[],
  ) {
    const fleetManager = await this.fleetRepository.findOne({
      where: { id: fleetManagerId },
    });

    if (!fleetManager) {
      throw new NotFoundException('Fleet Manager not found');
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file));
    const uploadedResults = await Promise.all(uploadPromises);

    const documentEntities = uploadedResults.map((uploaded, index) => {
      return this.fleetDocumentRepository.create({
        fleetManager,
        documentType: documentTypes[index],
        documentUrl: uploaded.secure_url,
        verificationStatus: 'pending',
        uploadDate: new Date(),
        isDeleted: false,
        createdAt: new Date(),
      });
    });

    return this.fleetDocumentRepository.save(documentEntities);
  }

  async getFilteredFleet(
    page: number,
    limit: number,
    search?: string,
    status?: 'active' | 'inactive',
    plan?: string,
    startDate?: string,
    endDate?: string,
    paymentStatus?: string,
  ) {
    const skip = (page - 1) * limit;

    // Build base where condition
    const where: any = {};

    if (search) {
      where.company_name = ILike(`%${search}%`);
    }

    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;

    if (startDate && endDate) {
      where.created_at = Between(new Date(startDate), new Date(endDate));
    }

    //  Get base company list first (lightweight)
    const [fleets, total] = await this.fleetRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data: fleets,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async editFleet(id: number, dto: EditFleetDto) {
    const fleet = await this.fleetRepository.findOne({
      where: { id: id },
    });

    if (!fleet) throw new NotFoundException('Company not found');

    // Check if email already exists for another company
    if (dto.fleet_email && dto.fleet_email !== fleet.email) {
      const emailExists = await this.fleetRepository.findOne({
        where: { email: dto.fleet_email },
      });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    // Check if contact already exists for another company
    if (dto.fleet_contact && dto.fleet_contact !== fleet.contact) {
      const contactExists = await this.fleetRepository.findOne({
        where: { contact: dto.fleet_contact },
      });
      if (contactExists)
        throw new ConflictException('Contact number already exists');
    }

    if (dto.is_active !== undefined && dto.is_active !== fleet.isActive) {
      const fleetUsers = await this.fleetUserRepository.find({
        where: { fleetManager: { id: fleet.id } },
      });

      await Promise.all(
        fleetUsers.map((user) =>
          this.fleetUserRepository.update(
            { id: user.id },
            { isActive: dto.is_active },
          ),
        ),
      );
    }

    // Update fields with fallback to existing values
    const updated = Object.assign(fleet, {
      name: dto.fleet_name ?? fleet.name,
      contact: dto.fleet_contact ?? fleet.contact,
      email: dto.fleet_email ?? fleet.email,
      regNumber: dto.fleet_registration_number ?? fleet.regNumber,
      address: dto.fleet_address ?? fleet.address,
      city: dto.fleet_city ?? fleet.city,
      state: dto.fleet_state ?? fleet.state,
      country: dto.fleet_country ?? fleet.country,
      is_active: dto.is_active ?? fleet.isActive,
      is_delete: dto.is_delete ?? fleet.isDelete,
    });

    await this.fleetRepository.save(updated);
    return updated;
  }

  async getAllFleetUsers(
    fleetId: number,
    page: number,
    limit: number,
    search?: string,
    status?: 'active' | 'inactive',
    role?: string,
  ) {
    const query = this.fleetUserRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.fmUsersRole', 'role')
      .where('user.fleetManager.id = :fleetId', { fleetId });

    // Status filtering
    if (status) {
      query.andWhere('user.isActive = :isActive', {
        isActive: status === 'active',
      });
    }

    //  Role name filtering
    if (role) {
      query.andWhere('role.roleName ILIKE :role', { role: `%${role}%` });
    }

    // Search (user_name, user_email, user_username)
    if (search) {
      query.andWhere(
        `(
          user.first_name ILIKE :search OR
          user.last_name ILIKE :search OR
          user.email ILIKE :search 
        )`,
        { search: `%${search}%` },
      );
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllFleetDocuments(
    fleetId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const query = this.fleetDocumentRepository
      .createQueryBuilder('document')
      .where('document.fleetManager.id = :fleetId', { fleetId });

    // Search (documentType)
    if (search) {
      query.andWhere(
        `(
          document.documentType ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
