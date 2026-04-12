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
import { Transactions } from 'src/entities/entities/Transactions';
import { platform } from 'os';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Bookings)
    private bookingRepo: Repository<Bookings>,
    @InjectRepository(Users)
    private usersRepo: Repository<Users>,
    @InjectRepository(FleetManagerVehicles)
    private vehiclesRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(Transactions)
    private transactionsRepo: Repository<Transactions>,

    private userService: ClientUsersService,
  ) {}

  async createBooking(dto: CreateBookingDto, clientEmail: string) {
    const client = await this.userService.findByEmail(clientEmail);

    if (!client) {
      throw new NotFoundException(
        `User with email ${clientEmail} not found. Please register.`,
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

    let baseRate = 0;
    let driverRate = 0;

    if (dto.serviceType === 'self_drive') {
      baseRate = vehicle.selfDriveBaseRate || 0;
    }

    if (dto.serviceType === 'with_driver') {
      baseRate = vehicle.selfDriveBaseRate || 0;
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

    let isPerHourPricing: boolean = dto.priceModel === 'per_hr';

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
      paymentStatus: 'pending',
      createdAt: new Date(),
      user: { id: client.id },
      vehicle: { id: dto.vehicleId },
      fleetManager: { id: vehicle.fleetManager.id },
    });

    const savedBooking = await this.bookingRepo.save(newBooking);
    return savedBooking;
  }

  async getClientBookings(clientId: number) {
    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('booking.user', 'user')
      .leftJoinAndSelect('booking.fleetManager', 'fm')
      .leftJoinAndSelect('booking.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.fleetManagerVehicleDocuments', 'documents')
      .leftJoinAndSelect('vehicle.vehicleRatings', 'ratings')
      .where('user.id = :clientId', { clientId })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    return bookings.map((b) => ({
      ...b,
      vehicle: {
        ...b.vehicle,
        fleetManagerVehicleDocuments: undefined,
        vehicleRatings: undefined,
        fleetManager: { name: b.fleetManager?.name || '' },
        documents:
          b.vehicle?.fleetManagerVehicleDocuments?.map((doc) => ({
            id: doc.id,
            name: doc.docType,
            url: doc.documentUrl,
          })) || [],
        avgRating: (() => {
          const valid =
            b.vehicle?.vehicleRatings?.filter((r) => r.rating != null) || [];
          return valid.length
            ? (
                valid.reduce((s, r) => s + (r.rating ?? 0), 0) / valid.length
              ).toFixed(2)
            : '0.00';
        })(),
        totalReviews: b.vehicle?.vehicleRatings?.length || 0,
      },
      fleetManager: undefined,
    }));
  }

  async processInitialPayment(
    clientId: number,
    bookingId: number,
    paymentMethod: string,
  ) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user: { id: clientId } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.status !== 'pending') {
      throw new BadRequestException(
        `Booking cannot be paid. Current status: ${booking.status}`,
      );
    }

    const amountToCharge = parseFloat(booking.initialTotalCharge) + 15.0; // Adding a platform fee of 15.0
    let transactionStatus: string;
    let transactionMethod: string = paymentMethod;

    const transactionCode =
      'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    if (paymentMethod === 'cash') {
      transactionStatus = 'simulated_cash';
    } else {
      transactionStatus = 'successful';
    }

    // 3. Save Transaction Record (Slip generation ke liye data)
    const newTransaction = this.transactionsRepo.create({
      booking: { id: bookingId },
      user: { id: clientId },
      transactionCode: transactionCode,
      method: transactionMethod as any,
      status: transactionStatus as any,
      amount: amountToCharge.toFixed(2),
      processedAt: new Date(),
    });

    await this.transactionsRepo.save(newTransaction);

    // 4. Update Booking Status
    await this.bookingRepo.update(bookingId, {
      paymentStatus: 'advance_paid',
    });

    return {
      message: 'Payment simulated successfully and booking confirmed.',
      transaction: {
        code: transactionCode,
        amount: amountToCharge.toFixed(2),
        method: transactionMethod,
        status: transactionStatus,
        date: newTransaction.processedAt,
        platformFee: 15.0,
      },
    };
  }


  async getBookingSlip(bookingId: number, clientId: number) {
    const bookingDetails = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.id = :bookingId', { bookingId })
      .andWhere('b.user.id = :clientId', { clientId })
      .leftJoinAndSelect('b.transactions', 't')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.vehicle', 'v')
      .leftJoinAndSelect('b.fleetManager', 'fm')
      .getOne();

    console.log(bookingDetails?.transactions[0]?.transactionCode)

    if (!bookingDetails) {
      throw new NotFoundException('Booking not found or is awaiting approval.');
    }

    const transaction = bookingDetails?.transactions[0];

    if (!transaction) {
      return {
        isSuccess: false,
        bookingCode: bookingDetails.bookingCode,
        transactionDetail: {
          transactionId: 'N/A',
          methodUsed: 'Payment Pending',
          initialBaseCharge: 0,
          extraCharges: 0,
          finalTotalAmount: null,
          paymentNote: 'Initial payment transaction record not found.',
        },
      };
    }

    return {
      isSuccess:
        transaction?.status === 'successful' ||
        transaction?.status === 'simulated_cash',

      bookingCode: bookingDetails.bookingCode,
      rentalPeriod: `${bookingDetails.pickupDate.toDateString()} - ${bookingDetails.returnDate.toDateString()}`,
      car: `${bookingDetails.vehicle?.make} ${bookingDetails.vehicle?.model}`,
      clientName: `${bookingDetails.user?.firstName} ${bookingDetails.user?.lastName}`,

      transactionDetail: {
        transactionId: transaction?.transactionCode || 'N/A',
        processedat : transaction?.processedAt,
        methodUsed: transaction?.method || 'Cash (Advance)',
        transactionStatus: transaction?.status,
        extraCharges: parseFloat(bookingDetails.extraChargesApplied || '0.00'),
        baseAmount: parseFloat(bookingDetails.initialTotalCharge).toFixed(2),
        platformFee: 15.0,
        tax: 0.0,
        finalTotalAmount: transaction?.amount,

        paymentNote:
          transaction?.method === 'cash'
            ? `Initial advance amount (${parseFloat(String(transaction?.amount ?? '0')).toFixed(2)} PKR) required at pickup.`
            : 'Payment received successfully.',
      },
    };
  }
}
