import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create_booking.dto';
import { Bookings } from 'src/entities/entities/Bookings';
import { Users } from 'src/entities/entities/Users';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { ClientUsersService } from '../User/user.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Bookings)
    private bookingRepo: Repository<Bookings>,
    @InjectRepository(Users)
    private usersRepo: Repository<Users>,
    @InjectRepository(FleetManagerVehicles)
    private vehiclesRepo: Repository<FleetManagerVehicles>,
    private userService: ClientUsersService,
  ) {}

  async createBooking(dto: CreateBookingDto) {
    const client = await this.userService.findByEmail(dto.email);

    if (!client) {
      throw new NotFoundException(
        `User with email ${dto.email} not found. Please register.`,
      );
    }

    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: dto.vehicleId, isDeleted: false },
      relations: ['fleetManager'],
    });

    if (!vehicle) {
      throw new NotFoundException(
        'Selected vehicle is not available for booking.',
      );
    }

    let baseRate: number = 0;
    let driverRate: number = 0;

    if (dto.serviceType === 'self_drive') {
      baseRate = vehicle.selfDriveBaseRate || 0;
    } else if (dto.serviceType === 'with_driver') {
      driverRate = vehicle.driverIncludedRate || 0;
      if (driverRate <= 0) {
        throw new BadRequestException('Driver rate not set for this vehicle.');
      }
    }
    if (baseRate <= 0) {
      throw new BadRequestException('Vehicle base rate is zero or not set.');
    }

    baseRate += driverRate;
    const pickup = new Date(dto.pickupDate);
    const returnT = new Date(dto.returnDate);
    const durationMs = returnT.getTime() - pickup.getTime();

    if (durationMs <= 0) {
      throw new BadRequestException(
        'Return date must be later than pickup date.',
      );
    }

    let totalhours: number = 0;
    let totaldays: number = 0;
    let initialTotalCharge;

    let isPerHourPricing: boolean = vehicle.pricingModel === 'per_hr';

    if (isPerHourPricing) {
      totalhours = Math.ceil(durationMs / (1000 * 3600));
      totaldays = 0;
      initialTotalCharge = baseRate * totalhours;
    } else {
      totaldays = Math.ceil(durationMs / (1000 * 3600 * 24));
      totalhours = 0;
      initialTotalCharge = baseRate * totaldays;
    }

    const bookingCode =
      'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newBooking = this.bookingRepo.create({
      bookingCode: bookingCode,
      pickupDate: pickup,
      returnDate: returnT,
      pickupLocation: dto.pickupLocation,
      returnLocation: dto.returnLocation,
      serviceType: dto.serviceType,
      priceModel: dto.priceModel,
      totalDays: totaldays,
      totalHours: totalhours,
      baseRatePerDayOrHour: vehicle.selfDriveBaseRate,
      driverRatePerHour: vehicle.driverIncludedRate || 0,
      driverHoursPerDay: vehicle.driverHoursIncluded || 0,
      initialTotalCharge: initialTotalCharge,
      status: 'pending',
      createdAt: new Date(),
      user: { id: client.id },
      vehicle: { id: dto.vehicleId },
      fleetManager: { id: vehicle.fleetManager.id },
    });

    const savedBooking = await this.bookingRepo.save(newBooking);
    return savedBooking;
  }
}
