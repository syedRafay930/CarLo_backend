import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';

@Injectable()
export class FmBookingService {
  constructor(
    @InjectRepository(Bookings)
    private bookingRepo: Repository<Bookings>,
    @InjectRepository(FleetManagerVehicles)
    private vehicleRepo: Repository<FleetManagerVehicles>,
  ) {}

  async getFleetBookings(params: {
    fleetManagerId: number;
    status?: string;
    page: number;
    limit: number;
  }) {
    const vehicleIds = await this.getFleetVehicleIds(params.fleetManagerId);

    if (vehicleIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: params.page,
        limit: params.limit,
        totalPages: 0,
      };
    }

    const base = () =>
      this.bookingRepo
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.vehicle', 'v')
        .leftJoinAndSelect('b.user', 'u')
        .where('v.id IN (:...ids)', { ids: vehicleIds });

    const filtered = () => {
      const q = base();
      if (params.status) {
        q.andWhere('b.status = :status', { status: params.status });
      }
      return q;
    };

    const total = await filtered().getCount();
    const data = await filtered()
      .orderBy('b.createdAt', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getMany();

    return {
      data: data.map((b) => this.mapBookingListRow(b)),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit) || 0,
    };
  }

  async getBookingDetail(bookingId: number, fleetManagerId: number) {
    const vehicleIds = await this.getFleetVehicleIds(fleetManagerId);

    const booking = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.vehicle', 'v')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.transactions', 't')
      .where('b.id = :id', { id: bookingId })
      .andWhere('v.id IN (:...ids)', { ids: vehicleIds })
      .getOne();

    if (!booking) {
      throw new NotFoundException(
        'Booking not found or does not belong to your fleet',
      );
    }

    return this.mapBookingDetail(booking);
  }

  async getFleetBookingStats(fleetManagerId: number) {
    const vehicleIds = await this.getFleetVehicleIds(fleetManagerId);

    if (vehicleIds.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        totalRevenue: 0,
      };
    }

    const stats = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)', 'count')
      .addSelect('SUM(b.finalAmountSettled)', 'revenue')
      .innerJoin('b.vehicle', 'v')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .groupBy('b.status')
      .getRawMany();

    const result = {
      total: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      totalRevenue: 0,
    };

    for (const s of stats) {
      const count = parseInt(String(s.count), 10) || 0;
      const revenue = parseFloat(String(s.revenue)) || 0;
      result.total += count;
      result.totalRevenue += revenue;
      const st = String(s.status);
      if (
        st === 'active' ||
        st === 'in_progress' ||
        st === 'overdue' ||
        st === 'ongoing'
      ) {
        result.active += count;
      } else if (st === 'completed') {
        result.completed += count;
      } else if (st === 'cancelled' || st === 'rejected') {
        result.cancelled += count;
      } else if (
        st === 'pending' ||
        st === 'confirmed' ||
        st === 'pending_payment'
      ) {
        result.pending += count;
      }
    }

    return result;
  }

  private mapBookingListRow(b: Bookings) {
    const finalAmt =
      b.finalAmountSettled != null && b.finalAmountSettled !== ''
        ? parseFloat(String(b.finalAmountSettled))
        : parseFloat(String(b.initialTotalCharge ?? 0));

    return {
      id: b.id,
      bookingCode: b.bookingCode,
      status: b.status,
      pickupDate: b.pickupDate,
      returnDate: b.returnDate,
      totalDays: b.totalDays,
      finalAmount: Number.isFinite(finalAmt) ? finalAmt : 0,
      paymentStatus: b.paymentStatus,
      vehicle: b.vehicle
        ? {
            id: b.vehicle.id,
            make: b.vehicle.make,
            model: b.vehicle.model,
            year: b.vehicle.year,
            licensePlate: b.vehicle.licensePlate,
          }
        : null,
      customer: b.user
        ? {
            id: b.user.id,
            firstName: b.user.firstName,
            lastName: b.user.lastName,
            email: b.user.email,
          }
        : null,
      createdAt: b.createdAt,
    };
  }

  private mapBookingDetail(b: Bookings) {
    const baseRate = parseFloat(String(b.baseRatePerDayOrHour ?? 0));
    const initial = parseFloat(String(b.initialTotalCharge ?? 0));
    const extras = parseFloat(String(b.extraChargesApplied ?? 0));
    const finalSettled =
      b.finalAmountSettled != null && b.finalAmountSettled !== ''
        ? parseFloat(String(b.finalAmountSettled))
        : null;

    const transactions = (b.transactions || []).map((t) => ({
      id: t.id,
      transactionCode: t.transactionCode,
      method: t.method,
      status: t.status,
      amount: parseFloat(String(t.amount)),
      processedAt: t.processedAt,
    }));

    return {
      id: b.id,
      bookingCode: b.bookingCode,
      status: b.status,
      paymentStatus: b.paymentStatus,
      serviceType: b.serviceType,
      priceModel: b.priceModel,
      pickupDate: b.pickupDate,
      returnDate: b.returnDate,
      pickupLocation: b.pickupLocation,
      returnLocation: b.returnLocation,
      totalDays: b.totalDays,
      amounts: {
        baseRatePerDayOrHour: Number.isFinite(baseRate) ? baseRate : 0,
        initialTotalCharge: Number.isFinite(initial) ? initial : 0,
        extraChargesApplied: Number.isFinite(extras) ? extras : 0,
        finalAmountSettled: finalSettled,
        displayTotal:
          finalSettled != null && Number.isFinite(finalSettled)
            ? finalSettled
            : initial,
      },
      vehicle: b.vehicle
        ? {
            id: b.vehicle.id,
            make: b.vehicle.make,
            model: b.vehicle.model,
            year: b.vehicle.year,
            licensePlate: b.vehicle.licensePlate,
          }
        : null,
      customer: b.user
        ? {
            id: b.user.id,
            firstName: b.user.firstName,
            lastName: b.user.lastName,
            email: b.user.email,
            contact: b.user.contact,
          }
        : null,
      transactions,
      createdAt: b.createdAt,
    };
  }

  private async getFleetVehicleIds(fleetManagerId: number): Promise<number[]> {
    const vehicles = await this.vehicleRepo.find({
      where: { fleetManager: { id: fleetManagerId } },
      select: ['id'],
    });
    return vehicles.map((v) => v.id);
  }
}
