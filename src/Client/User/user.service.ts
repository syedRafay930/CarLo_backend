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
import { Users } from 'src/entities/entities/Users';
import { MailService } from 'src/Nodemailer/mailer.service';
import { ILike } from 'typeorm';
import { SignUpDto } from 'src/Client/Auth/dto/sign_up.dto';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { UpdateProfileDto } from './dto/update_profile.dto';
import { UserFavoriteVehicles } from 'src/entities/entities/UserFavoriteVehicles';

@Injectable()
export class ClientUsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(UserFavoriteVehicles)
    private readonly userFavoriteVehiclesRepository: Repository<UserFavoriteVehicles>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<Users | null> {
    return this.usersRepository.findOne({
      where: { email: email },
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

  async createUser(dto: SignUpDto) {
    // 1. duplicate check
    const exists = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email or username already exists');
    }

    // 2. generate temp password
    const tempPassword = dto.password;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 3. create user
    const user = this.usersRepository.create({
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email,
      password: hashedPassword,
      contact: dto.contact,
      isActive: true,
      isDelete: false,
      createdAt: new Date(),
    });

    return this.usersRepository.save(user);
  }

  async updateUserProfile(
    clientId: number,
    updateProfileDto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: clientId, isDelete: false },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let profilePicUrl: string | undefined;
    if (file) {
      const uploadResult = await uploadToCloudinary(file);
      profilePicUrl = uploadResult.secure_url;
    }

    const updateData: Partial<Users> = {
      ...updateProfileDto,
      ...(profilePicUrl && { profilePic: profilePicUrl }),
    };

    await this.usersRepository.update(clientId, updateData);
    const updatedUser = await this.usersRepository.findOne({
      where: { id: clientId },
    });

    return updatedUser;
  }

  async markAsFavorite(clientId: number, vehicleId: number) {
    const existing = await this.userFavoriteVehiclesRepository.findOne({
      where: { userId: clientId, vehicleId: vehicleId },
    });

    if (existing) {
      throw new ConflictException('Vehicle is already marked as favorite.');
    }
    const newFavorite = this.userFavoriteVehiclesRepository.create({
      userId: clientId,
      vehicleId: vehicleId,
      isActive: true,
    });

    await this.userFavoriteVehiclesRepository.save(newFavorite);

    return { message: 'Vehicle marked as favorite successfully.' };
  }

  async unmarkAsFavorite(clientId: number, vehicleId: number) {
    const result = await this.userFavoriteVehiclesRepository.delete({
      userId: clientId,
      vehicleId: vehicleId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        'This vehicle is not in your favorites or does not exist.',
      );
    }

    return { message: 'Vehicle unmarked as favorite successfully.' };
  }

  async getFavoriteVehicles(
    clientId: number,
    page: number,
    limit: number,
    search: string,
    sortOrder: 'DESC',
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.userFavoriteVehiclesRepository
      .createQueryBuilder('fav')
      .where('fav.userId = :clientId', { clientId })
      .andWhere('fav.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('fav.vehicle', 'vehicle');

    queryBuilder.leftJoinAndSelect(
      'vehicle.fleetManagerVehicleDocuments',
      'coverImage',
      'coverImage.docType = :docType',
      { docType: 'image_coverimg' },
    );

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.licensePlate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`fav.addedAt`, sortOrder).skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const favoriteVehicles = data.map((fav) => {
      const vehicle = fav.vehicle;
      const coverImageUrl =
        vehicle.fleetManagerVehicleDocuments?.[0]?.documentUrl || null;
      return {
        ...vehicle,
        coverImageUrl: coverImageUrl,
      };
    });

    return {
      data: favoriteVehicles,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    };
  }
}
