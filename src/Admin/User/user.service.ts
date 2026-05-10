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
import { RedisService } from '../Auth/redis.service';
import { Admin } from 'src/entities/entities/Admin';
import { AdminRole } from 'src/entities/entities/AdminRole';

import { AddInternalUserDto } from './dto/add_internal_user.dto';
import { EditInternalUserDto } from './dto/edit_internal_user.dto';
import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Admin)
    private readonly usersRepository: Repository<Admin>,
    @InjectRepository(AdminRole)
    private readonly rolesRepository: Repository<AdminRole>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Admin | null> {
    return this.usersRepository.findOne({
      where: { email: email },
      relations: ['role'],
    });
  }

  async updatePassword(userEmail: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: userEmail },
    });

    if (user) {
      await this.usersRepository.update(
        { email: userEmail },
        { hashedPassword: newPassword },
      );
    }
  }

  async getAdminIds(): Promise<number[]> {
    const admins = await this.usersRepository.find({
      select: ['id'],
      where: [{ role: { id: 1 } }],
    });
    return admins.map((a) => a.id);
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
      where: { name: dto.Role },
    });

    if (!role) throw new NotFoundException('Role not found');

    if (role.name.toLowerCase() === 'superadmin') {
      throw new ConflictException('Cannot assign SuperAdmin role');
    }

    // 3. generate temp password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 4. create user
    const user = this.usersRepository.create({
      firstName: dto.FirstName,
      lastName: dto.LastName,
      email: dto.Email,
      hashedPassword: hashedPassword,
      isDeactive: true,
      isDelete: false,
      createdAt: new Date(),
      contact: dto.Contact || null,
      role: role,
    });

    return this.usersRepository.save(user);
  }

  async generateJwtTokenAndResetLink(user: Admin) {
    const users = await this.findByEmail(user.email);
    if (!users) throw new UnauthorizedException('User not found');

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
      'user_invitation',
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

  async editInternalUserIncludingSelf(id: number, dto: EditInternalUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    let newRoleId = user.role.id;
    let selectedRole;

    if (dto.Role) {
      const role = await this.rolesRepository.findOne({
        where: { name: dto.Role },
      });
      if (!role) throw new NotFoundException('Role not found');
      if (role.name.toLowerCase() === 'superadmin') {
        throw new ConflictException('Cannot assign SuperAdmin role');
      }
      newRoleId = role.id;
      selectedRole = role;
    } else {
      selectedRole = await this.rolesRepository.findOne({
        where: { id: user.role.id },
      });
    }

    const updated = Object.assign(user, {
      firstName: dto.FirstName ?? user.firstName,
      lastName: dto.LastName ?? user.lastName,
      contact: dto.Contact ? Number(dto.Contact) : user.contact,
      role_id: newRoleId, //  updated here
      isDeactive: dto.isActive ?? user.isDeactive,
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
    const roleRow = await this.rolesRepository.findOne({
      where: { id: currentUserRoleId },
    });
    const isSuperAdmin = (roleRow?.name ?? '').toLowerCase() === 'superadmin';

    const whereCondition: Record<string, unknown> = {
      id: Not(currentUserId),
    };

    if (filterStatus === 'active') {
      whereCondition.isDeactive = false;
    } else if (filterStatus === 'inactive') {
      whereCondition.isDeactive = true;
    }

    if (filterRole) {
      whereCondition.role = { name: filterRole };
    }

    if (search) {
      whereCondition.firstName = ILike(`%${search}%`);
    }

    if (!isSuperAdmin) {
      whereCondition.isDelete = false;
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where: whereCondition,
      relations: ['role'],
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

  async countAdmins(): Promise<number> {
    return this.usersRepository.count();
  }

  /** One-time bootstrap: remove POST /admin/auth/seed-super-admin after use. */
  async seedSuperAdminIfEmpty(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const dup = await this.usersRepository.findOne({
      where: { email: params.email },
    });
    if (dup) {
      return {
        message: 'Admin with this email already exists',
        seeded: false as const,
      };
    }

    let role = await this.rolesRepository.findOne({
      where: { name: 'SuperAdmin' },
    });
    if (!role) {
      role = this.rolesRepository.create({ name: 'SuperAdmin' });
      await this.rolesRepository.save(role);
    }

    const hashedPassword = await bcrypt.hash(params.password, 12);
    const user = this.usersRepository.create({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      hashedPassword,
      isDeactive: false,
      isDelete: false,
      isFirstlogin: false,
      createdAt: new Date(),
      role,
    });
    const saved = await this.usersRepository.save(user);
    const { hashedPassword: _hp, ...safe } = saved;
    return {
      message: 'Super admin created',
      seeded: true as const,
      user: safe,
    };
  }
}
