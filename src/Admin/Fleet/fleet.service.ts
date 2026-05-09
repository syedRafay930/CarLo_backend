import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, Between } from 'typeorm';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { FleetManagersDocuments } from 'src/entities/entities/FleetManagersDocuments';
import { AddFleetWithUserDto } from './dto/add_fleet_with_admin.dto';
import { RedisService } from '../Auth/redis.service';
import { MailService } from 'src/Nodemailer/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { EditFleetDto } from './dto/edit_fleet_.dto';
import {
  FleetRegistrationApplications,
  ApplicationStatus,
} from 'src/entities/entities/FleetRegistrationApplications';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { Subscriptions } from 'src/entities/entities/Subscriptions';
import { FirebaseService } from 'src/firebase/firebase.service';
import axios from 'axios';
import FormData from 'form-data';

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
    @InjectRepository(FleetRegistrationApplications)
    private readonly appRepo: Repository<FleetRegistrationApplications>,
    @InjectRepository(Subscriptions)
    private readonly subscriptionRepository: Repository<Subscriptions>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
    private dataSource: DataSource,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getFleetById(fleetId: number) {
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
        city: dto.fleet.fleet_city ?? null,
        state: dto.fleet.fleet_state ?? null,
        country: dto.fleet.fleet_country ?? null,
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

      const passwordWasSet =
        !!dto.user.Password && dto.user.Password.trim().length >= 8;
      const plainPassword = passwordWasSet
        ? dto.user.Password!.trim()
        : Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-4);
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

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
        isFirstlogin: !passwordWasSet,
        isActive: passwordWasSet,
        isDelete: false,
      }) as FleetManagerUsers;
      const savedFleetUser = await queryRunner.manager.save(fleetUser);
      await queryRunner.commitTransaction();
      return {
        fleet: {
          id: savedFleet.id,
          name: savedFleet.name,
          email: savedFleet.email,
          type: savedFleet.type,
          isActive: savedFleet.isActive,
        },
        user: {
          id: savedFleetUser.id,
          first_name: savedFleetUser.firstName,
          last_name: savedFleetUser.lastName,
          email: savedFleetUser.email,
        },
        ...(passwordWasSet ? {} : { tempPassword: plainPassword }),
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Failed to create company with user',
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
    files: Express.Multer.File[],
    documentTypes: string[],
    fleetManagerId?: number,
    applicationId?: number,
  ) {
    if (!fleetManagerId && !applicationId) {
      throw new BadRequestException(
        'Either fleetManagerId or applicationId is required',
      );
    }
    let fleetManager: FleetManagers | null = null;

    if (fleetManagerId) {
      fleetManager = await this.fleetRepository.findOne({
        where: { id: fleetManagerId },
      });
      if (!fleetManager) throw new NotFoundException('Fleet Manager not found');
    }

    let application: FleetRegistrationApplications | null = null;
    if (applicationId) {
      application = await this.appRepo.findOne({
        where: { id: applicationId },
      });
      if (!application) throw new NotFoundException('Application not found');
      if (application.status === ApplicationStatus.APPROVED) {
        throw new BadRequestException('Application already approved');
      }
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file));
    const uploadedResults = await Promise.all(uploadPromises);

    const documentEntities = uploadedResults.map((uploaded, index) => {
      return this.fleetDocumentRepository.create({
        fleetManager: fleetManager ?? null,
        application: application ?? null,
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
      where.name = ILike(`%${search}%`);
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

  async submitApplication(dto: SubmitApplicationDto) {
    const existing = await this.appRepo.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.status === ApplicationStatus.REJECTED || existing.status === ApplicationStatus.PENDING) {
        await this.appRepo.update(existing.id, {
          businessName: dto.business_name,
          ownerFirstName: dto.owner_first_name,
          ownerLastName: dto.owner_last_name,
          contact: dto.contact,
          city: dto.city ?? null,
          state: dto.state ?? null,
          country: dto.country ?? 'Pakistan',
          address: dto.address ?? null,
          fleetType: dto.fleet_type,
          cnic: dto.cnic,
          regNumber: dto.reg_number,
          status: ApplicationStatus.PENDING,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          updatedAt: new Date(),
        });
        return {
          application_id: existing.id,
          message: 'Application resubmitted successfully',
        };
      }

      throw new ConflictException(
        'An application with this email already exists',
      );
    }

    const application = this.appRepo.create({
      businessName: dto.business_name,
      ownerFirstName: dto.owner_first_name,
      ownerLastName: dto.owner_last_name,
      email: dto.email,
      contact: dto.contact,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? 'Pakistan',
      address: dto.address ?? null,
      fleetType: dto.fleet_type,
      cnic: dto.cnic,
      regNumber: dto.reg_number,
      status: ApplicationStatus.PENDING,
    });

    const saved = await this.appRepo.save(application);
    return {
      application_id: saved.id,
      message: 'Application submitted successfully',
    };
  }

  async getApplicationStatus(applicationId: number) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      select: ['id', 'businessName', 'status', 'rejectionReason', 'createdAt'],
    });

    if (!application) throw new NotFoundException('Application not found');

    return application;
  }

  async getActiveSubscriptions() {
    const subs = await this.subscriptionRepository.find({
      where: { isActive: true },
      order: { monthlyPrice: 'ASC' },
    });

    return subs.map((s) => ({
      id: s.id,
      name: s.name,
      monthlyPrice: Number(s.monthlyPrice),
      description: s.description,
      maxUsers: s.maxUsers,
      maxVehicles: s.maxVehicles,
      isPrioritySupport: s.isPrioritySupport,
      allowsAiVerification: s.allowsAiVerification,
    }));
  }

  async selectSubscription(applicationId: number, subscriptionId: number) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('Application not found');

    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application already approved');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, isActive: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    await this.appRepo.update(applicationId, {
      subscriptions: subscription,
      updatedAt: new Date(),
    });
    try {
      await this.firebaseService.saveAndSendNotificationToAdmins({
        title: '🏢 New Dealership Application',
        body: `${application.businessName} has submitted a registration request. Review and verify documents.`,
        application_id: application.id,
        type: 'shop_registration',
        redirect_url: `/applications/${application.id}`,
      });
    } catch {
      console.error('Notification failed for application:', application.id);
    }

    return { message: 'Subscription selected successfully' };
  }

  async getAllApplications(query: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, search } = query;

    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('app.fleetManagersDocuments', 'docs')
      .orderBy('app.createdAt', 'DESC');

    if (status) {
      qb.andWhere('app.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        `(app.businessName ILIKE :s OR app.email ILIKE :s OR app.contact ILIKE :s)`,
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplicationById(id: number) {
    const app = await this.appRepo.findOne({
      where: { id },
      relations: ['reviewedBy', 'fleetManagersDocuments'],
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async verifyFleetDocuments(
    cnicFront: Express.Multer.File,
    cnicBack: Express.Multer.File,
    shopPaper: Express.Multer.File,
    regNumber: string | null,
    cnicNumber: string | null,
  ) {
    const form = new FormData();

    form.append('cnic_front', cnicFront.buffer, {
      filename: 'cnic_front.jpg',
      contentType: cnicFront.mimetype,
    });
    form.append('cnic_back', cnicBack.buffer, {
      filename: 'cnic_back.jpg',
      contentType: cnicBack.mimetype,
    });
    form.append('shop_paper', shopPaper.buffer, {
      filename: 'shop_paper.jpg',
      contentType: shopPaper.mimetype,
    });
    form.append('reg_number', regNumber);
    form.append('cnic_number', cnicNumber);

    try {
      const { data } = await axios.post(
        `${'http://localhost:8000'}/verify-fleet-application`,
        form,
        { headers: form.getHeaders() },
      );
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data || 'Document verification failed';
      throw new BadRequestException(msg);
    }
  }
}
