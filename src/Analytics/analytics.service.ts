import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';
import { Users } from 'src/entities/entities/Users';
import type {
  BookingAnalytics,
  FleetAnalyticsSummary,
  PlatformAnalyticsSummary,
  RevenueAnalytics,
  TimeSeriesPoint,
  VehicleAnalytics,
} from './analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Bookings)
    private readonly bookingRepo: Repository<Bookings>,
    @InjectRepository(FleetManagerVehicles)
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(FleetManagers)
    private readonly fleetRepo: Repository<FleetManagers>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}

  /**
   * Revenue per row for SQL aggregates (Postgres column names; alias b = bookings).
   * Uses final_amount_settled when set, else initial_total_charge.
   */
  private bookingRevenueLineSql(): string {
    return `COALESCE("b"."final_amount_settled", "b"."initial_total_charge", 0)`;
  }

  private getDateRange(period: '7d' | '30d' | '90d'): {
    startDate: Date;
    endDate: Date;
    previousStartDate: Date;
  } {
    const endDate = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);
    return { startDate, endDate, previousStartDate };
  }

  private daysInRange(startDate: Date, endDate: Date): number {
    return Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
  }

  async getPlatformAnalytics(
    period: '7d' | '30d' | '90d',
  ): Promise<PlatformAnalyticsSummary> {
    const { startDate, endDate, previousStartDate } = this.getDateRange(period);

    const [revenue, bookings, vehicles, fleetStats, clientStats] =
      await Promise.all([
        this.getPlatformRevenue(startDate, endDate, previousStartDate),
        this.getPlatformBookings(startDate, endDate, previousStartDate),
        this.getPlatformVehicles(startDate, endDate),
        this.getFleetStats(startDate, endDate),
        this.getNewClientsCount(startDate, endDate),
      ]);

    return {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      revenue,
      bookings,
      vehicles,
      totalFleets: fleetStats.total,
      activeFleets: fleetStats.active,
      newClientsInPeriod: clientStats,
      topFleets: fleetStats.top,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getPlatformRevenue(
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
  ): Promise<RevenueAnalytics> {
    const line = this.bookingRevenueLineSql();

    const currentRevenue = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`COALESCE(SUM(${line}), 0)`, 'total')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .getRawOne();

    const previousRevenue = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`COALESCE(SUM(${line}), 0)`, 'total')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: previousStartDate,
        end: startDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .getRawOne();

    const current = parseFloat(String(currentRevenue?.total ?? 0)) || 0;
    const previous = parseFloat(String(previousRevenue?.total ?? 0)) || 0;
    const change =
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    const dailyRevenue = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`TO_CHAR(DATE_TRUNC('day', b.createdAt), 'YYYY-MM-DD')`, 'date')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'value')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy(`DATE_TRUNC('day', b.createdAt)`)
      .orderBy(`DATE_TRUNC('day', b.createdAt)`, 'ASC')
      .getRawMany();

    const cityRevenue = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoin('b.fleetManager', 'fm')
      .select('fm.city', 'city')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'revenue')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy('fm.city')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    return {
      totalRevenue: current,
      revenueChange: change,
      revenueByPeriod: dailyRevenue.map((r) => ({
        date: String(r.date ?? '').trim(),
        value: parseFloat(String(r.value)) || 0,
      })),
      revenueByCity: cityRevenue.map((r) => ({
        city: r.city || 'Unknown',
        revenue: parseFloat(String(r.revenue)) || 0,
      })),
    };
  }

  private async getPlatformBookings(
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
  ): Promise<BookingAnalytics> {
    const currentCount = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getCount();

    const previousCount = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: previousStartDate,
        end: startDate,
      })
      .getCount();

    const change =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 0;

    const dailyBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`TO_CHAR(DATE_TRUNC('day', b.createdAt), 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(b.id)', 'value')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`DATE_TRUNC('day', b.createdAt)`)
      .orderBy(`DATE_TRUNC('day', b.createdAt)`, 'ASC')
      .getRawMany();

    const statusBreakdown = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)', 'count')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('b.status')
      .getRawMany();

    const totalForPercentage =
      statusBreakdown.reduce(
        (sum, s) => sum + parseInt(String(s.count), 10),
        0,
      ) || 1;

    return {
      totalBookings: currentCount,
      bookingChange: change,
      bookingsByPeriod: dailyBookings.map((r) => ({
        date: String(r.date ?? '').trim(),
        value: parseInt(String(r.value), 10) || 0,
      })),
      bookingsByStatus: statusBreakdown.map((s) => {
        const c = parseInt(String(s.count), 10) || 0;
        return {
          status: s.status,
          count: c,
          percentage: Math.round((c / totalForPercentage) * 100),
        };
      }),
    };
  }

  private async getPlatformVehicles(
    startDate: Date,
    endDate: Date,
  ): Promise<VehicleAnalytics> {
    const totalVehicles = await this.vehicleRepo.count({
      where: { isApprovedByAdmin: true, isDeleted: false },
    });

    const activeVehicles = await this.vehicleRepo.count({
      where: {
        isApprovedByAdmin: true,
        isDeleted: false,
        vehicleStatus: 'available',
      },
    });

    const line = this.bookingRevenueLineSql();

    const topVehicles = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select('v.id', 'vehicleId')
      .addSelect('v.make', 'make')
      .addSelect('v.model', 'model')
      .addSelect('v.year', 'year')
      .addSelect('v.vehicleType', 'vehicleType')
      .addSelect('COUNT(b.id)', 'totalBookings')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'totalRevenue')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .andWhere('v.isDeleted = false')
      .groupBy('v.id')
      .addGroupBy('v.make')
      .addGroupBy('v.model')
      .addGroupBy('v.year')
      .addGroupBy('v.vehicleType')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(5)
      .getRawMany();

    const typeStats = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select('v.vehicleType', 'vehicleType')
      .addSelect('COUNT(DISTINCT v.id)', 'count')
      .addSelect('COUNT(b.id)', 'bookings')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .andWhere('v.isDeleted = false')
      .groupBy('v.vehicleType')
      .getRawMany();

    const daysInPeriod = this.daysInRange(startDate, endDate);

    return {
      totalVehicles,
      activeVehicles,
      topPerformingVehicles: topVehicles.map((v) => {
        const tb = parseInt(String(v.totalBookings), 10) || 0;
        return {
          vehicleId: parseInt(String(v.vehicleId), 10),
          make: v.make,
          model: v.model,
          year: parseInt(String(v.year), 10),
          vehicleType: String(v.vehicleType ?? 'other'),
          totalBookings: tb,
          totalRevenue: parseFloat(String(v.totalRevenue)) || 0,
          utilizationRate: Math.min(
            100,
            Math.round((tb / Math.max(1, daysInPeriod)) * 100),
          ),
        };
      }),
      utilizationByType: typeStats.map((t) => {
        const vc = parseInt(String(t.count), 10) || 0;
        const bk = parseInt(String(t.bookings), 10) || 0;
        const denom = Math.max(1, vc * daysInPeriod);
        return {
          vehicleType: t.vehicleType || 'unknown',
          count: vc,
          avgUtilization: Math.min(100, Math.round((bk / denom) * 100)),
        };
      }),
    };
  }

  private async getFleetStats(startDate: Date, endDate: Date) {
    const total = await this.fleetRepo
      .createQueryBuilder('fm')
      .where('(fm.isDelete = false OR fm.isDelete IS NULL)')
      .getCount();

    const active = await this.fleetRepo
      .createQueryBuilder('fm')
      .where('(fm.isDelete = false OR fm.isDelete IS NULL)')
      .andWhere('fm.isActive = true')
      .getCount();

    const line = this.bookingRevenueLineSql();

    const topFleets = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoin('b.fleetManager', 'fm')
      .select('fm.id', 'fleetId')
      .addSelect('fm.name', 'fleetName')
      .addSelect('fm.city', 'city')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'totalRevenue')
      .addSelect('COUNT(b.id)', 'totalBookings')
      .where('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy('fm.id')
      .addGroupBy('fm.name')
      .addGroupBy('fm.city')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total,
      active,
      top: topFleets.map((f) => ({
        fleetId: parseInt(String(f.fleetId), 10),
        fleetName: f.fleetName || 'Unknown',
        city: f.city || 'Unknown',
        totalRevenue: parseFloat(String(f.totalRevenue)) || 0,
        totalBookings: parseInt(String(f.totalBookings), 10) || 0,
      })),
    };
  }

  private async getNewClientsCount(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getCount();
  }

  async getFleetAnalytics(
    fleetId: number,
    period: '7d' | '30d' | '90d',
  ): Promise<FleetAnalyticsSummary> {
    const { startDate, endDate, previousStartDate } = this.getDateRange(period);

    const fleet = await this.fleetRepo.findOne({ where: { id: fleetId } });
    if (!fleet) throw new NotFoundException('Fleet not found');

    const vehicles = await this.vehicleRepo.find({
      where: { fleetManager: { id: fleetId }, isDeleted: false },
      select: ['id'],
    });
    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      return this.buildEmptyFleetAnalytics(fleet, period, startDate, endDate);
    }

    const [revenue, bookings, vehicleAnalytics] = await Promise.all([
      this.getFleetRevenue(vehicleIds, startDate, endDate, previousStartDate),
      this.getFleetBookings(vehicleIds, startDate, endDate, previousStartDate),
      this.getFleetVehicleAnalytics(vehicleIds, startDate, endDate),
    ]);

    return {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fleetId,
      fleetName: fleet.name,
      fleetCity: fleet.city ?? '',
      revenue,
      bookings,
      vehicles: vehicleAnalytics,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getFleetRevenue(
    vehicleIds: number[],
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
  ): Promise<RevenueAnalytics> {
    const line = this.bookingRevenueLineSql();

    const buildQuery = (start: Date, end: Date) =>
      this.bookingRepo
        .createQueryBuilder('b')
        .innerJoin('b.vehicle', 'v')
        .select(`COALESCE(SUM(${line}), 0)`, 'total')
        .where('v.id IN (:...ids)', { ids: vehicleIds })
        .andWhere('b.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('b.status NOT IN (:...revExcl)', {
          revExcl: ['cancelled', 'rejected'],
        });

    const [current, previous] = await Promise.all([
      buildQuery(startDate, endDate).getRawOne(),
      buildQuery(previousStartDate, startDate).getRawOne(),
    ]);

    const currentTotal = parseFloat(String(current?.total ?? 0)) || 0;
    const previousTotal = parseFloat(String(previous?.total ?? 0)) || 0;
    const change =
      previousTotal > 0
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

    const dailyRevenue = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select(`TO_CHAR(DATE_TRUNC('day', b.createdAt), 'YYYY-MM-DD')`, 'date')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'value')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy(`DATE_TRUNC('day', b.createdAt)`)
      .orderBy(`DATE_TRUNC('day', b.createdAt)`, 'ASC')
      .getRawMany();

    return {
      totalRevenue: currentTotal,
      revenueChange: change,
      revenueByPeriod: dailyRevenue.map((r) => ({
        date: String(r.date ?? '').trim(),
        value: parseFloat(String(r.value)) || 0,
      })),
      revenueByCity: [],
    };
  }

  private async getFleetBookings(
    vehicleIds: number[],
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
  ): Promise<BookingAnalytics> {
    const currentCount = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getCount();

    const previousCount = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: previousStartDate,
        end: startDate,
      })
      .getCount();

    const change =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 0;

    const dailyBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select(`TO_CHAR(DATE_TRUNC('day', b.createdAt), 'YYYY-MM-DD')`, 'date')
      .addSelect('COUNT(b.id)', 'value')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`DATE_TRUNC('day', b.createdAt)`)
      .orderBy(`DATE_TRUNC('day', b.createdAt)`, 'ASC')
      .getRawMany();

    const statusBreakdown = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)', 'count')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('b.status')
      .getRawMany();

    const totalForPct =
      statusBreakdown.reduce((s, r) => s + parseInt(String(r.count), 10), 0) ||
      1;

    return {
      totalBookings: currentCount,
      bookingChange: change,
      bookingsByPeriod: dailyBookings.map((r) => ({
        date: String(r.date ?? '').trim(),
        value: parseInt(String(r.value), 10) || 0,
      })),
      bookingsByStatus: statusBreakdown.map((s) => {
        const c = parseInt(String(s.count), 10) || 0;
        return {
          status: s.status,
          count: c,
          percentage: Math.round((c / totalForPct) * 100),
        };
      }),
    };
  }

  private async getFleetVehicleAnalytics(
    vehicleIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<VehicleAnalytics> {
    const vehicles = await this.vehicleRepo.find({
      where: { id: In(vehicleIds), isDeleted: false },
    });
    const activeVehicles = vehicles.filter(
      (v) => v.vehicleStatus === 'available',
    ).length;

    const line = this.bookingRevenueLineSql();

    const topVehicles = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select('v.id', 'vehicleId')
      .addSelect('v.make', 'make')
      .addSelect('v.model', 'model')
      .addSelect('v.year', 'year')
      .addSelect('v.vehicleType', 'vehicleType')
      .addSelect('COUNT(b.id)', 'totalBookings')
      .addSelect(`COALESCE(SUM(${line}), 0)`, 'totalRevenue')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy('v.id')
      .addGroupBy('v.make')
      .addGroupBy('v.model')
      .addGroupBy('v.year')
      .addGroupBy('v.vehicleType')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(5)
      .getRawMany();

    const typeStats = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .select('v.vehicleType', 'vehicleType')
      .addSelect('COUNT(DISTINCT v.id)', 'count')
      .addSelect('COUNT(b.id)', 'bookings')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('b.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('b.status NOT IN (:...revExcl)', {
        revExcl: ['cancelled', 'rejected'],
      })
      .groupBy('v.vehicleType')
      .getRawMany();

    const daysInPeriod = this.daysInRange(startDate, endDate);

    return {
      totalVehicles: vehicles.length,
      activeVehicles,
      topPerformingVehicles: topVehicles.map((v) => {
        const tb = parseInt(String(v.totalBookings), 10) || 0;
        return {
          vehicleId: parseInt(String(v.vehicleId), 10),
          make: v.make,
          model: v.model,
          year: parseInt(String(v.year), 10),
          vehicleType: String(v.vehicleType ?? 'other'),
          totalBookings: tb,
          totalRevenue: parseFloat(String(v.totalRevenue)) || 0,
          utilizationRate: Math.min(
            100,
            Math.round((tb / Math.max(1, daysInPeriod)) * 100),
          ),
        };
      }),
      utilizationByType: typeStats.map((t) => {
        const vc = parseInt(String(t.count), 10) || 0;
        const bk = parseInt(String(t.bookings), 10) || 0;
        const denom = Math.max(1, vc * daysInPeriod);
        return {
          vehicleType: t.vehicleType || 'unknown',
          count: vc,
          avgUtilization: Math.min(100, Math.round((bk / denom) * 100)),
        };
      }),
    };
  }

  private buildEmptyFleetAnalytics(
    fleet: FleetManagers,
    period: '7d' | '30d' | '90d',
    startDate: Date,
    endDate: Date,
  ): FleetAnalyticsSummary {
    const emptyRev: RevenueAnalytics = {
      totalRevenue: 0,
      revenueChange: 0,
      revenueByPeriod: [],
      revenueByCity: [],
    };
    return {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fleetId: fleet.id,
      fleetName: fleet.name,
      fleetCity: fleet.city ?? '',
      revenue: emptyRev,
      bookings: {
        totalBookings: 0,
        bookingChange: 0,
        bookingsByPeriod: [],
        bookingsByStatus: [],
      },
      vehicles: {
        totalVehicles: 0,
        activeVehicles: 0,
        topPerformingVehicles: [],
        utilizationByType: [],
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getClientAnalytics(clientId: number): Promise<{
    totalBookings: number;
    totalSpend: number;
    completedTrips: number;
    cancelledTrips: number;
    averageBookingValue: number;
    favoriteVehicleType: string | null;
    spendByMonth: TimeSeriesPoint[];
    bookingsByStatus: { status: string; count: number }[];
  }> {
    const allBookings = await this.bookingRepo.find({
      where: { user: { id: clientId } },
      relations: ['vehicle'],
      order: { createdAt: 'DESC' },
    });

    const bookingAmount = (b: Bookings) => {
      const f = b.finalAmountSettled;
      const i = b.initialTotalCharge;
      const n = parseFloat(String(f != null && f !== '' ? f : (i ?? '0'))) || 0;
      return n;
    };

    const totalSpend = allBookings
      .filter((b) =>
        ['completed', 'in_progress', 'confirmed', 'pending_payment'].includes(
          b.status,
        ),
      )
      .reduce((sum, b) => sum + bookingAmount(b), 0);

    const completedTrips = allBookings.filter(
      (b) => b.status === 'completed',
    ).length;
    const cancelledTrips = allBookings.filter(
      (b) => b.status === 'cancelled',
    ).length;

    const avgValue =
      allBookings.length > 0 ? Math.round(totalSpend / allBookings.length) : 0;

    const typeCount: Record<string, number> = {};
    for (const b of allBookings) {
      const t = b.vehicle?.vehicleType;
      if (t) typeCount[t] = (typeCount[t] || 0) + 1;
    }
    const favoriteType =
      Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    const monthlySpend: Record<string, number> = {};
    for (const b of allBookings) {
      if (!['cancelled', 'rejected'].includes(b.status)) {
        const month = new Date(b.createdAt).toISOString().substring(0, 7);
        monthlySpend[month] = (monthlySpend[month] || 0) + bookingAmount(b);
      }
    }
    const spendByMonth = Object.entries(monthlySpend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([date, value]) => ({ date, value }));

    const statusCount: Record<string, number> = {};
    for (const b of allBookings) {
      statusCount[b.status] = (statusCount[b.status] || 0) + 1;
    }
    const bookingsByStatus = Object.entries(statusCount).map(
      ([status, count]) => ({ status, count }),
    );

    return {
      totalBookings: allBookings.length,
      totalSpend: Math.round(totalSpend),
      completedTrips,
      cancelledTrips,
      averageBookingValue: avgValue,
      favoriteVehicleType: favoriteType,
      spendByMonth,
      bookingsByStatus,
    };
  }
}
