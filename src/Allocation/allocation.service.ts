import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
import { AllocationRequestDto } from './dto/allocation_request.dto';
import {
  AllocationResult,
  AllocationStatsResult,
  VehicleScore,
} from './allocation.types';

const W = {
  location: 0.3,
  type: 0.25,
  price: 0.2,
  rating: 0.15,
  reliability: 0.1,
} as const;

/** Statuses that reserve the vehicle for the given period */
const BLOCKING_BOOKING_STATUSES = [
  'confirmed',
  'in_progress',
  'pending_payment',
  'pending',
] as const;

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(FleetManagerVehicles)
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(VehicleRatings)
    private readonly ratingsRepo: Repository<VehicleRatings>,
    @InjectRepository(Bookings)
    private readonly bookingRepo: Repository<Bookings>,
  ) {}

  async getRecommendations(dto: AllocationRequestDto): Promise<AllocationResult> {
    const pickup = new Date(dto.pickupDate);
    const returnD = new Date(dto.returnDate);
    const ms = returnD.getTime() - pickup.getTime();
    const totalDays = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));

    const vehicles = await this.vehicleRepo.find({
      where: {
        isApprovedByAdmin: true,
        vehicleStatus: 'available',
        isDeleted: false,
      },
      relations: ['fleetManager'],
    });

    if (vehicles.length === 0) {
      return this.buildEmptyResult(dto, totalDays, 0);
    }

    const bookedIds = await this.getBookedVehicleIds(pickup, returnD);
    const bookedSet = new Set(bookedIds);
    const candidates = vehicles.filter((v) => !bookedSet.has(v.id));

    if (candidates.length === 0) {
      return this.buildEmptyResult(dto, totalDays, vehicles.length);
    }

    const ratingsMap = await this.getRatingsMap(candidates.map((v) => v.id));
    const fleetIds = [
      ...new Set(
        candidates
          .map((v) => v.fleetManager?.id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const reliabilityMap = await this.getFleetReliabilityMap(fleetIds);

    const scored: VehicleScore[] = candidates.map((vehicle) =>
      this.scoreVehicle(
        vehicle,
        dto,
        ratingsMap.get(vehicle.id) ?? { avg: 0, count: 0 },
        reliabilityMap.get(vehicle.fleetManager?.id ?? 0) ?? 50,
      ),
    );

    const top3 = scored
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    const agentExplanation = this.buildAgentExplanation(top3, dto, totalDays);

    return {
      recommendations: top3,
      totalCandidates: candidates.length,
      requestSummary: {
        requestedType: dto.vehicleType,
        requestedCity: dto.city,
        budgetPerDay: dto.budgetPerDay ?? null,
        pickupDate: dto.pickupDate,
        returnDate: dto.returnDate,
        totalDays,
      },
      agentExplanation,
      scoredAt: new Date().toISOString(),
    };
  }

  async getStats(): Promise<AllocationStatsResult> {
    const rows = await this.vehicleRepo
      .createQueryBuilder('v')
      .innerJoin('v.fleetManager', 'fm')
      .select('COALESCE(fm.city, \'Unknown\')', 'city')
      .addSelect('v.vehicleType', 'type')
      .where('v.isApprovedByAdmin = :ap', { ap: true })
      .andWhere('v.vehicleStatus = :st', { st: 'available' })
      .andWhere('v.isDeleted = :del', { del: false })
      .getRawMany();

    const cityMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    for (const r of rows) {
      const city = String(r.city ?? 'Unknown');
      const type = String(r.type ?? 'unknown');
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
      typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
    }

    const byCity = [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const byType = [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAvailable: rows.length,
      byCity,
      byType,
      lastUpdated: new Date().toISOString(),
    };
  }

  private scoreVehicle(
    vehicle: FleetManagerVehicles,
    dto: AllocationRequestDto,
    ratings: { avg: number; count: number },
    reliabilityScore: number,
  ): VehicleScore {
    const reasoning: string[] = [];

    const fleetCity = (vehicle.fleetManager?.city || '').toLowerCase().trim();
    const requestedCity = dto.city.toLowerCase().trim();
    let locationScore = 0;
    if (fleetCity && fleetCity === requestedCity) {
      locationScore = 100;
      reasoning.push(`✓ Located in ${dto.city} — exact city match`);
    } else if (
      fleetCity &&
      (fleetCity.includes(requestedCity) || requestedCity.includes(fleetCity))
    ) {
      locationScore = 60;
      reasoning.push(`~ Near ${dto.city} — partial city match`);
    } else {
      locationScore = 10;
      reasoning.push(
        `✗ Located in ${vehicle.fleetManager?.city || 'unknown'} — different city`,
      );
    }

    const requestedType = dto.vehicleType.toLowerCase().trim();
    const actualType = (vehicle.vehicleType || '').toLowerCase();
    let typeScore = 0;
    if (requestedType === 'any') {
      typeScore = 80;
      reasoning.push('✓ Any vehicle type accepted');
    } else if (this.typesMatch(requestedType, actualType)) {
      if (actualType === requestedType) {
        typeScore = 100;
        reasoning.push(`✓ ${vehicle.vehicleType} — exact type match`);
      } else {
        typeScore = 75;
        reasoning.push(
          `~ ${vehicle.vehicleType} — close match for requested ${dto.vehicleType}`,
        );
      }
    } else {
      typeScore = 20;
      reasoning.push(
        `✗ ${vehicle.vehicleType} — requested ${dto.vehicleType}`,
      );
    }

    if (dto.minSeats != null && vehicle.seatingCapacity < dto.minSeats) {
      typeScore = Math.min(typeScore, 30);
      reasoning.push(
        `⚠ Only ${vehicle.seatingCapacity} seats (need ${dto.minSeats}+)`,
      );
    }

    const pref = dto.transmissionPreference?.toLowerCase().trim();
    if (
      pref &&
      pref !== 'any' &&
      vehicle.transmissionType?.toLowerCase() !== pref
    ) {
      typeScore = Math.min(typeScore, 60);
      reasoning.push(
        `~ ${vehicle.transmissionType} transmission (preferred: ${dto.transmissionPreference})`,
      );
    }

    const self = Number(vehicle.selfDriveBaseRate ?? 0);
    const drv = Number(vehicle.driverIncludedRate ?? 0);
    const dailyRate = self > 0 ? self : drv;
    let priceScore = 50;
    if (dto.budgetPerDay != null && dailyRate > 0) {
      const ratio = dailyRate / dto.budgetPerDay;
      if (ratio <= 0.8) {
        priceScore = 100;
        reasoning.push(
          `✓ PKR ${dailyRate}/day — well within budget (${Math.round(ratio * 100)}% of budget)`,
        );
      } else if (ratio <= 1.0) {
        priceScore = 80;
        reasoning.push(`✓ PKR ${dailyRate}/day — within budget`);
      } else if (ratio <= 1.2) {
        priceScore = 50;
        reasoning.push(`~ PKR ${dailyRate}/day — slightly over budget`);
      } else {
        priceScore = 10;
        reasoning.push(`✗ PKR ${dailyRate}/day — exceeds budget`);
      }
    } else if (dailyRate > 0) {
      reasoning.push(`ℹ PKR ${dailyRate}/day`);
    }

    let ratingScore = 60;
    if (ratings.count > 0 && ratings.avg > 0) {
      ratingScore = (ratings.avg / 5) * 100;
      reasoning.push(`★ ${ratings.avg.toFixed(1)}/5 (${ratings.count} reviews)`);
    } else {
      reasoning.push('ℹ No reviews yet');
    }

    reasoning.push(
      reliabilityScore >= 70
        ? '✓ Reliable fleet partner'
        : `~ Fleet reliability score: ${Math.round(reliabilityScore)}%`,
    );

    const totalScore = Math.round(
      locationScore * W.location +
        typeScore * W.type +
        priceScore * W.price +
        ratingScore * W.rating +
        reliabilityScore * W.reliability,
    );

    return {
      vehicleId: vehicle.id,
      totalScore,
      breakdown: {
        locationScore: Math.round(locationScore),
        typeScore: Math.round(typeScore),
        priceScore: Math.round(priceScore),
        ratingScore: Math.round(ratingScore),
        reliabilityScore: Math.round(reliabilityScore),
      },
      reasoning,
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vehicleType: vehicle.vehicleType,
        color: vehicle.color,
        seatingCapacity: vehicle.seatingCapacity,
        transmissionType: vehicle.transmissionType,
        fuelType: vehicle.fuelType,
        selfDriveBaseRate: self,
        driverIncludedRate: drv,
        licensePlate: vehicle.licensePlate,
        fleetName: vehicle.fleetManager?.name || 'Unknown',
        fleetCity: vehicle.fleetManager?.city || 'Unknown',
        fleetCountry: vehicle.fleetManager?.country || 'Pakistan',
        averageRating: ratings.avg,
        totalRatings: ratings.count,
      },
    };
  }

  private typesMatch(requested: string, actual: string): boolean {
    if (requested === 'any') return true;
    if (actual === requested) return true;
    if (requested === 'luxury') {
      return ['sports_car', 'other'].includes(actual);
    }
    if (requested === 'van') {
      return ['van', 'bus', 'coaster'].includes(actual);
    }
    return false;
  }

  private async getBookedVehicleIds(
    pickup: Date,
    returnD: Date,
  ): Promise<number[]> {
    try {
      const rows = await this.bookingRepo
        .createQueryBuilder('booking')
        .innerJoin('booking.vehicle', 'vehicle')
        .select('vehicle.id', 'vehicleId')
        .where('booking.status IN (:...statuses)', {
          statuses: [...BLOCKING_BOOKING_STATUSES],
        })
        .andWhere('booking.pickupDate <= :returnD', { returnD })
        .andWhere('booking.returnDate >= :pickup', { pickup })
        .getRawMany();

      return rows
        .map((b) => b.vehicleId)
        .filter((id) => id != null)
        .map(Number);
    } catch {
      return [];
    }
  }

  private async getRatingsMap(
    vehicleIds: number[],
  ): Promise<Map<number, { avg: number; count: number }>> {
    const map = new Map<number, { avg: number; count: number }>();
    if (vehicleIds.length === 0) return map;

    try {
      const rows = await this.ratingsRepo
        .createQueryBuilder('r')
        .innerJoin('r.vehicle', 'v')
        .select('v.id', 'vehicleId')
        .addSelect('AVG(r.rating)', 'avg')
        .addSelect('COUNT(r.id)', 'cnt')
        .where('v.id IN (:...ids)', { ids: vehicleIds })
        .andWhere('r.rating IS NOT NULL')
        .groupBy('v.id')
        .getRawMany();

      for (const row of rows) {
        map.set(Number(row.vehicleId), {
          avg: parseFloat(row.avg) || 0,
          count: parseInt(row.cnt, 10) || 0,
        });
      }
    } catch {
      /* ignore */
    }
    return map;
  }

  private async getFleetReliabilityMap(
    fleetIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (fleetIds.length === 0) return map;

    try {
      const stats = await this.vehicleRepo
        .createQueryBuilder('v')
        .innerJoin('v.fleetManager', 'fm')
        .select('fm.id', 'fleetId')
        .addSelect('COUNT(v.id)', 'total')
        .addSelect(
          'SUM(CASE WHEN v.isApprovedByAdmin = true THEN 1 ELSE 0 END)',
          'approved',
        )
        .where('fm.id IN (:...ids)', { ids: fleetIds })
        .groupBy('fm.id')
        .getRawMany();

      for (const s of stats) {
        const total = parseInt(s.total, 10) || 1;
        const approved = parseInt(s.approved, 10) || 0;
        map.set(Number(s.fleetId), Math.round((approved / total) * 100));
      }
    } catch {
      /* ignore */
    }
    return map;
  }

  private buildAgentExplanation(
    top3: VehicleScore[],
    dto: AllocationRequestDto,
    totalDays: number,
  ): string {
    if (top3.length === 0) {
      return `No vehicles found matching your criteria for ${dto.city}.`;
    }
    const best = top3[0];
    const rate = best.vehicle.selfDriveBaseRate || best.vehicle.driverIncludedRate;
    const totalCost = rate * totalDays;
    return (
      `Based on ${totalDays} day(s) in ${dto.city}, the AI agent ` +
      `recommends a ${best.vehicle.year} ${best.vehicle.make} ` +
      `${best.vehicle.model} as the best match ` +
      `(score: ${best.totalScore}/100). ` +
      `Estimated total: PKR ${Math.round(totalCost).toLocaleString()}. ` +
      `${top3.length} vehicle(s) shortlisted from available inventory.`
    );
  }

  private buildEmptyResult(
    dto: AllocationRequestDto,
    totalDays: number,
    totalVehicles: number,
  ): AllocationResult {
    return {
      recommendations: [],
      totalCandidates: 0,
      requestSummary: {
        requestedType: dto.vehicleType,
        requestedCity: dto.city,
        budgetPerDay: dto.budgetPerDay ?? null,
        pickupDate: dto.pickupDate,
        returnDate: dto.returnDate,
        totalDays,
      },
      agentExplanation:
        totalVehicles > 0
          ? `All ${totalVehicles} vehicles are booked for your selected dates.`
          : `No vehicles are currently available in the system.`,
      scoredAt: new Date().toISOString(),
    };
  }
}
