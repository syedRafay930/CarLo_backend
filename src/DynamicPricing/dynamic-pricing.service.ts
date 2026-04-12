import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { VehicleDynamicPricing } from 'src/entities/entities/VehicleDynamicPricing';
import { Bookings } from 'src/entities/entities/Bookings';
import { PricingBreakdown, PricingEngineService } from './pricing-engine.service';

/** Bookings that count toward demand/utilization (excludes cancelled/rejected). */
const FM_PRICING_STATUSES_EXCLUDE = ['cancelled', 'rejected'] as const;

export interface PricingCycleResult {
  processed: number;
  skipped: number;
  errors: number;
  details: { vehicleId: number; message: string }[];
}

export interface CurrentPricePayload {
  baseRate: number;
  adjustedRate: number;
  multiplierPercent: number;
  reasoning: string[];
  breakdown: PricingBreakdown | null;
  isActive: boolean;
}

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    @InjectRepository(FleetManagerVehicles)
    private vehicleRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(VehicleDynamicPricing)
    private pricingRepo: Repository<VehicleDynamicPricing>,
    @InjectRepository(Bookings)
    private bookingRepo: Repository<Bookings>,
    private pricingEngine: PricingEngineService,
  ) {}

  isDynamicPricingEnabled(v: FleetManagerVehicles): boolean {
    return v.dynamicPricingEnabled !== false;
  }

  async runPricingCycle(targetDate?: Date): Promise<PricingCycleResult> {
    const date = targetDate ? new Date(targetDate) : new Date();
    date.setHours(12, 0, 0, 0);

    const result: PricingCycleResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    const vehicles = await this.vehicleRepo.find({
      where: {
        isApprovedByAdmin: true,
        isDeleted: false,
      },
      relations: ['fleetManager'],
    });

    for (const vehicle of vehicles) {
      if (!this.isDynamicPricingEnabled(vehicle)) {
        result.skipped++;
        continue;
      }
      if (vehicle.vehicleStatus !== 'available') {
        result.skipped++;
        continue;
      }

      try {
        const saved = await this.calculateAndSavePrice(vehicle, date);
        if (saved) {
          result.processed++;
        } else {
          result.skipped++;
        }
      } catch (err: any) {
        result.errors++;
        const msg = err?.message ?? String(err);
        this.logger.error(
          `[DynamicPricing] Vehicle ${vehicle.id}: ${msg}`,
          err?.stack,
        );
        result.details.push({ vehicleId: vehicle.id, message: msg });
      }
    }

    return result;
  }

  async calculateAndSavePrice(
    vehicle: FleetManagerVehicles,
    targetDate: Date,
  ): Promise<VehicleDynamicPricing | null> {
    const baseRaw = vehicle.selfDriveBaseRate;
    const baseRate =
      typeof baseRaw === 'string'
        ? parseFloat(baseRaw)
        : Number(baseRaw ?? 0);
    if (!Number.isFinite(baseRate) || baseRate <= 0) return null;

    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const city = vehicle.fleetManager?.city ?? '';
    if (!city) {
      this.logger.warn(
        `Vehicle ${vehicle.id}: fleet manager city missing; demand/competition skewed`,
      );
    }

    const recentBookingCount = await this.getRecentDemand(
      vehicle.vehicleType,
      city,
      sevenDaysAgo,
      targetDate,
    );

    const utilizationDays = await this.getVehicleUtilization(
      vehicle.id,
      thirtyDaysAgo,
      targetDate,
    );

    const competitorCount = await this.getCompetitorCount(
      vehicle.vehicleType,
      city,
      vehicle.id,
    );

    const maxAdj =
      vehicle.maxAdjustmentPercent != null
        ? Number(vehicle.maxAdjustmentPercent)
        : 30;

    const { adjustedRate, multiplier, breakdown, reasoning } =
      this.pricingEngine.calculateAdjustment({
        baseRate,
        vehicleType: vehicle.vehicleType,
        city,
        targetDate,
        recentBookingCount,
        vehicleUtilizationDays: utilizationDays,
        competitorCount,
        maxAdjustmentPercent: Math.min(50, Math.max(0, maxAdj)),
      });

    const startDateTime = new Date(targetDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(targetDate);
    endDateTime.setHours(23, 59, 59, 999);

    await this.pricingRepo
      .createQueryBuilder()
      .update(VehicleDynamicPricing)
      .set({ endDateTime: new Date() })
      .where('vehicle_id = :vid', { vid: vehicle.id })
      .andWhere('end_date_time > :start', { start: startDateTime })
      .andWhere('start_date_time <= :endbf', { endbf: endDateTime })
      .execute();

    const payload = {
      baseRate,
      multiplierPercent: Math.round(multiplier * 100),
      breakdown,
      reasoning,
    };

    const pricing = this.pricingRepo.create({
      vehicle: { id: vehicle.id },
      newDailyRate: String(adjustedRate),
      startDateTime,
      endDateTime,
      reason: 'demand_surge',
      engineBreakdownJson: JSON.stringify(payload),
    });

    return this.pricingRepo.save(pricing);
  }

  async getActivePricingMapForVehicleIds(
    vehicleIds: number[],
    at = new Date(),
  ): Promise<Map<number, VehicleDynamicPricing>> {
    const map = new Map<number, VehicleDynamicPricing>();
    if (!vehicleIds.length) return map;

    const rows = await this.pricingRepo
      .createQueryBuilder('dp')
      .innerJoinAndSelect('dp.vehicle', 'v')
      .where('v.id IN (:...ids)', { ids: vehicleIds })
      .andWhere('dp.startDateTime <= :at', { at })
      .andWhere('dp.endDateTime >= :at', { at })
      .orderBy('dp.startDateTime', 'DESC')
      .getMany();

    for (const row of rows) {
      const vid = row.vehicle?.id;
      if (vid != null && !map.has(vid)) map.set(vid, row);
    }
    return map;
  }

  private parseEnginePayload(row: VehicleDynamicPricing | null): {
    multiplierPercent: number;
    reasoning: string[];
    breakdown: PricingBreakdown | null;
  } {
    if (!row?.engineBreakdownJson) {
      return { multiplierPercent: 0, reasoning: [], breakdown: null };
    }
    try {
      const o = JSON.parse(row.engineBreakdownJson) as {
        multiplierPercent?: number;
        reasoning?: string[];
        breakdown?: PricingBreakdown;
      };
      return {
        multiplierPercent: o.multiplierPercent ?? 0,
        reasoning: Array.isArray(o.reasoning) ? o.reasoning : [],
        breakdown: o.breakdown ?? null,
      };
    } catch {
      return { multiplierPercent: 0, reasoning: [], breakdown: null };
    }
  }

  async getCurrentPriceForVehicle(
    vehicleId: number,
  ): Promise<CurrentPricePayload> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
      relations: ['fleetManager'],
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const now = new Date();
    const active = await this.pricingRepo
      .createQueryBuilder('dp')
      .innerJoin('dp.vehicle', 'v')
      .where('v.id = :id', { id: vehicleId })
      .andWhere('dp.startDateTime <= :now', { now })
      .andWhere('dp.endDateTime >= :now', { now })
      .orderBy('dp.startDateTime', 'DESC')
      .getOne();

    const baseRaw = vehicle.selfDriveBaseRate;
    const baseRate =
      typeof baseRaw === 'string'
        ? parseFloat(baseRaw)
        : Number(baseRaw ?? 0);

    if (!active) {
      return {
        baseRate,
        adjustedRate: baseRate,
        multiplierPercent: 0,
        reasoning: ['No dynamic pricing active — using base rate'],
        breakdown: null,
        isActive: false,
      };
    }

    const parsed = this.parseEnginePayload(active);
    const adj = parseFloat(String(active.newDailyRate ?? baseRate));

    return {
      baseRate,
      adjustedRate: Number.isFinite(adj) ? adj : baseRate,
      multiplierPercent: parsed.multiplierPercent,
      reasoning: parsed.reasoning.length
        ? parsed.reasoning
        : ['Dynamic pricing active'],
      breakdown: parsed.breakdown,
      isActive: true,
    };
  }

  async getPricingHistory(
    vehicleId: number,
  ): Promise<VehicleDynamicPricing[]> {
    return this.pricingRepo.find({
      where: { vehicle: { id: vehicleId } },
      order: { startDateTime: 'DESC' },
      take: 30,
    });
  }

  async updateVehiclePricingConfig(
    vehicleId: number,
    config: { maxAdjustmentPercent: number; dynamicPricingEnabled: boolean },
    fleetManagerId: number,
  ): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, fleetManager: { id: fleetManagerId } },
    });
    if (!vehicle) {
      throw new ForbiddenException('Vehicle not found in your fleet');
    }
    await this.vehicleRepo.update(vehicleId, {
      maxAdjustmentPercent: Math.min(50, Math.max(0, config.maxAdjustmentPercent)),
      dynamicPricingEnabled: config.dynamicPricingEnabled,
    });
  }

  async getFleetPricingSummary(fleetManagerId: number) {
    const vehicles = await this.vehicleRepo.find({
      where: { fleetManager: { id: fleetManagerId }, isDeleted: false },
      order: { id: 'ASC' },
    });

    const ids = vehicles.map((v) => v.id);
    const priceMap = await this.getActivePricingMapForVehicleIds(ids);

    return vehicles.map((v) => {
      const baseRaw = v.selfDriveBaseRate;
      const baseRate =
        typeof baseRaw === 'string'
          ? parseFloat(baseRaw)
          : Number(baseRaw ?? 0);
      const row = priceMap.get(v.id);
      const parsed = this.parseEnginePayload(row ?? null);
      const adj = row
        ? parseFloat(String(row.newDailyRate ?? baseRate))
        : baseRate;

      return {
        vehicleId: v.id,
        make: v.make,
        model: v.model,
        baseRate,
        adjustedRate: Number.isFinite(adj) ? adj : baseRate,
        multiplierPercent: parsed.multiplierPercent,
        dynamicPricingEnabled: this.isDynamicPricingEnabled(v),
      };
    });
  }

  async getAdminPricingOverview(): Promise<{
    totalVehiclesWithDynamicPricing: number;
    averageAdjustmentPercent: number;
    highestSurgeVehicle: {
      vehicleId: number;
      multiplierPercent: number;
      make: string;
      model: string;
    } | null;
    lowestDiscountVehicle: {
      vehicleId: number;
      multiplierPercent: number;
      make: string;
      model: string;
    } | null;
    pricingByCity: { city: string; count: number; avgRate: number }[];
  }> {
    const now = new Date();
    const activePricings = await this.pricingRepo
      .createQueryBuilder('dp')
      .leftJoinAndSelect('dp.vehicle', 'v')
      .leftJoinAndSelect('v.fleetManager', 'fm')
      .where('dp.startDateTime <= :now', { now })
      .andWhere('dp.endDateTime >= :now', { now })
      .getMany();

    const cityMap = new Map<string, { count: number; totalRate: number }>();
    let maxM: {
      vehicleId: number;
      multiplierPercent: number;
      make: string;
      model: string;
    } | null = null;
    let minM: {
      vehicleId: number;
      multiplierPercent: number;
      make: string;
      model: string;
    } | null = null;

    const multipliers: number[] = [];

    for (const p of activePricings) {
      const city = p.vehicle?.fleetManager?.city || 'Unknown';
      const rate = parseFloat(String(p.newDailyRate ?? 0));
      const existing = cityMap.get(city) || { count: 0, totalRate: 0 };
      cityMap.set(city, {
        count: existing.count + 1,
        totalRate: existing.totalRate + (Number.isFinite(rate) ? rate : 0),
      });

      const { multiplierPercent } = this.parseEnginePayload(p);
      multipliers.push(multiplierPercent);

      const vid = p.vehicle?.id;
      const make = p.vehicle?.make ?? '';
      const model = p.vehicle?.model ?? '';
      if (vid != null) {
        if (
          !maxM ||
          multiplierPercent > maxM.multiplierPercent ||
          (multiplierPercent === maxM.multiplierPercent && vid < maxM.vehicleId)
        ) {
          maxM = { vehicleId: vid, multiplierPercent, make, model };
        }
        if (
          !minM ||
          multiplierPercent < minM.multiplierPercent ||
          (multiplierPercent === minM.multiplierPercent && vid < minM.vehicleId)
        ) {
          minM = { vehicleId: vid, multiplierPercent, make, model };
        }
      }
    }

    const pricingByCity = Array.from(cityMap.entries()).map(
      ([city, data]) => ({
        city,
        count: data.count,
        avgRate:
          data.count > 0 ? Math.round(data.totalRate / data.count) : 0,
      }),
    );

    const avgMultiplier =
      multipliers.length > 0
        ? Math.round(
            multipliers.reduce((a, b) => a + b, 0) / multipliers.length,
          )
        : 0;

    return {
      totalVehiclesWithDynamicPricing: activePricings.length,
      averageAdjustmentPercent: avgMultiplier,
      highestSurgeVehicle: maxM,
      lowestDiscountVehicle: minM,
      pricingByCity,
    };
  }

  private async getRecentDemand(
    vehicleType: string,
    city: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    if (!city) return 0;
    try {
      return await this.bookingRepo
        .createQueryBuilder('b')
        .innerJoin('b.vehicle', 'v')
        .innerJoin('v.fleetManager', 'fm')
        .where('v.vehicleType = :type', { type: vehicleType })
        .andWhere('fm.city = :city', { city })
        .andWhere('b.createdAt BETWEEN :from AND :to', { from, to })
        .andWhere('b.status NOT IN (:...ex)', {
          ex: [...FM_PRICING_STATUSES_EXCLUDE],
        })
        .getCount();
    } catch {
      return 0;
    }
  }

  private async getVehicleUtilization(
    vehicleId: number,
    from: Date,
    to: Date,
  ): Promise<number> {
    try {
      const bookings = await this.bookingRepo
        .createQueryBuilder('b')
        .innerJoin('b.vehicle', 'v')
        .where('v.id = :vid', { vid: vehicleId })
        .andWhere('b.pickupDate < :to', { to })
        .andWhere('b.returnDate > :from', { from })
        .andWhere('b.status NOT IN (:...ex)', {
          ex: [...FM_PRICING_STATUSES_EXCLUDE],
        })
        .getMany();

      const daySet = new Set<string>();
      for (const booking of bookings) {
        const pickup = new Date(booking.pickupDate);
        const ret = new Date(booking.returnDate);
        let d = new Date(Math.max(pickup.getTime(), from.getTime()));
        const endCap = new Date(Math.min(ret.getTime(), to.getTime()));
        while (d < endCap) {
          daySet.add(d.toISOString().slice(0, 10));
          d = new Date(d.getTime() + 86400000);
        }
      }
      return Math.min(30, daySet.size);
    } catch {
      return 0;
    }
  }

  private async getCompetitorCount(
    vehicleType: string,
    city: string,
    excludeVehicleId: number,
  ): Promise<number> {
    if (!city) return 0;
    try {
      return await this.vehicleRepo
        .createQueryBuilder('v')
        .innerJoin('v.fleetManager', 'fm')
        .where('v.vehicleType = :type', { type: vehicleType })
        .andWhere('fm.city = :city', { city })
        .andWhere('v.id != :id', { id: excludeVehicleId })
        .andWhere('v.isApprovedByAdmin = true')
        .andWhere('v.isDeleted = false')
        .andWhere('v.vehicleStatus = :vs', { vs: 'available' })
        .getCount();
    } catch {
      return 0;
    }
  }
}
