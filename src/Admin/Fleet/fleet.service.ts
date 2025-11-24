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

  async uploadDocuments(fleetManagerId: number,files: Express.Multer.File[],documentTypes: string[]) 
  {
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
}
