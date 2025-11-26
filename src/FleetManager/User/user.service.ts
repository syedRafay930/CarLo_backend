import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/Admin/Auth/redis.service';
import { FleetManagerUsers } from 'src/entities/entities/FleetManagerUsers';
import { FleetManagerUsersRole } from 'src/entities/entities/FleetManagerUsersRole';
import { AddInternalUserDto } from 'src/Admin/User/dto/add_internal_user.dto';
import { FM_EditInternalUserDto } from './dto/edit.internal.user.dto';
import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';
@Injectable()
export class FMUsersService {
  constructor(
    @InjectRepository(FleetManagerUsers)
    private readonly usersRepository: Repository<FleetManagerUsers>,
    @InjectRepository(FleetManagerUsersRole)
    private readonly rolesRepository: Repository<FleetManagerUsersRole>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<FleetManagerUsers | null> {
    return this.usersRepository.findOne({
      where: { email: email },
      relations: ['fmUsersRole'],
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await this.usersRepository.update(
        { email: userEmail },
        { password: newPassword },
      );
    }
  }
  async createInternalUser(dto: AddInternalUserDto) {
    // 1. duplicate check
    const exists = await this.usersRepository.findOne({
      where: { email: dto.Email },
    });
    if (exists) {
      throw new ConflictException('Email or username already exists');
    }

    // 2. get role entity
    const role = await this.rolesRepository.findOne({
      where: { roleName: dto.Role },
    });

    if (!role) throw new NotFoundException('Role not found');

    // 3. generate temp password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 4. create user
    const user = this.usersRepository.create({
      firstName: dto.FirstName,
      lastName: dto.LastName,
      email: dto.Email,
      password: hashedPassword,
      isActive: false,
      isDelete: false,
      createdAt: new Date(),
      contact: dto.Contact || null,
      fmUsersRole: role,
      invitedAt: new Date(),
      isFirstlogin: true,
    });

    return this.usersRepository.save(user);
  }

  async generateJwtTokenAndResetLink(user: FleetManagerUsers) {
    const users = await this.findByEmail(user.email);
    if (!users) throw new UnauthorizedException('User not found');
    if (!users.firstName)
      throw new UnauthorizedException('User first name not found');

    const token = this.jwtService.sign(
      { sub: users.email },
      {
        secret: this.configService.get<string>('RESET_SECRET'),
        expiresIn: '5m',
      },
    );

    await this.redisService.setValue(`forgot:${token}`, users.email, 300); // 5 mins

    const resetLink = `http://localhost:5173/reset-password?token=${token}&createNewPassword=true`;

    await this.mailService.sendTemplatedMail(
      users.email,
      'You’ve been invited to CarLo-Admin!',
      'user-invitation',
      {
        username: users.firstName,
        userId: users.email,
        setPasswordLink: resetLink,
      },
    );

    return {
      message: 'Reset link sent to email',
    };
  }

  async editInternalUserIncludingSelf(id: number, dto: FM_EditInternalUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    let newRoleId = user.fmUsersRole.id;
    let selectedRole;

    if (dto.Role) {
      const role = await this.rolesRepository.findOne({
        where: { roleName: dto.Role },
      });
      if (!role) throw new NotFoundException('Role not found');
      newRoleId = role.id;
      selectedRole = role;
    } else {
      selectedRole = await this.rolesRepository.findOne({
        where: { id: user.fmUsersRole.id },
      });
    }

    const updated = Object.assign(user, {
      firstName: dto.FirstName ?? user.firstName,
      lastName: dto.LastName ?? user.lastName,
      contact: dto.Contact ? Number(dto.Contact) : user.contact,
      role_id: newRoleId,
      isDeactive: dto.isActive ?? user.isActive,
      isDelete: dto.isdelete ?? user.isDelete,
      cnic: dto.cnic ?? user.cnic,
      dob: dto.dob ?? user.dob,
    });

    await this.usersRepository.save(updated);

    return {
      ...updated,
      role: selectedRole ? { name: selectedRole.roleName } : null,
    };
  }

  async getInternalUsersExcludingSelf(
    currentUserId: number,
    currentUserRoleId: number,
    page: number,
    limit: number,
    filterRole?: string,
    filterStatus?: 'active' | 'inactive',
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const isSuperAdmin = currentUserRoleId;

    const whereCondition: any = {
      id: Not(currentUserId),
    };

    if (filterStatus === 'active') {
      whereCondition.isActive = false;
    } else if (filterStatus === 'inactive') {
      whereCondition.isActive = true;
    }

    if (filterRole) {
      whereCondition.fmUsersRole = { roleName: filterRole };
    }

    if (search) {
      whereCondition.firstName = ILike(`%${search}%`);
      whereCondition.email = ILike(`%${search}%`);
      whereCondition.contact = ILike(`%${search}%`);
    }

    if (!isSuperAdmin) {
      whereCondition.isdelete = false;
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where: whereCondition,
      relations: ['fmUsersRole'],
      order: {
        id: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
  async softDeleteUser(id: number, is_delete: boolean) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });
    if (!user) throw new NotFoundException('User not found');

    if (is_delete) {
      await this.usersRepository.update(id, {
        isDelete: true,
        deletedAt: new Date(),
      });
    } else {
      await this.usersRepository.update(id, {
        isDelete: false,
        deletedAt: null,
      });
    }

    return {
      message: 'User marked for deletion. Will be deleted in 10 days.',
      id: id,
    };
  }
}
