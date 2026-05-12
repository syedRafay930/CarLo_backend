import { Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Bookings } from 'src/entities/entities/Bookings';
import { serializeVehicle, SerializedVehicle } from './vehicle-serializer';

export interface SearchVehiclesInput {
  city?: string;
  vehicleType?: string;
  minSeats?: number;
  fuelType?: string;
  serviceType?: 'self_drive' | 'with_driver';
}

export class SearchVehiclesTool {
  constructor(
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    private readonly bookingRepo: Repository<Bookings>,
  ) {}

  async run(input: SearchVehiclesInput): Promise<SerializedVehicle[] | { error: string }> {
    try {
      const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.fleetManager', 'fm')
      .where('v.isApprovedByAdmin = :ap', { ap: true })
      .andWhere('v.vehicleStatus = :vs', { vs: 'available' })
      .andWhere('v.isDeleted = :del', { del: false });

    if (input.city?.trim()) {
      qb.andWhere('fm.city ILIKE :city', { city: `%${input.city.trim()}%` });
    }

    if (input.vehicleType?.trim()) {
      qb.andWhere('v.vehicleType = :vt', { vt: input.vehicleType.trim() });
    }

    if (input.minSeats != null && Number.isFinite(input.minSeats)) {
      qb.andWhere('v.seatingCapacity >= :ms', { ms: input.minSeats });
    }

    if (input.fuelType?.trim()) {
      qb.andWhere('v.fuelType = :ft', { ft: input.fuelType.trim() });
    }

    if (input.serviceType === 'self_drive') {
      qb.andWhere("v.driverServiceOption IN ('self_drive_only', 'both')");
    }
    if (input.serviceType === 'with_driver') {
      qb.andWhere("v.driverServiceOption IN ('driver_included', 'both')");
    }

    const candidates = await qb.orderBy('v.createdAt', 'DESC').take(80).getMany();

    if (candidates.length === 0) {
      return [];
    }

    const ids = candidates.map((c) => c.id);
    const rawCounts = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.vehicle_id', 'vehicleId')
      .addSelect('COUNT(b.id)', 'cnt')
      .where('b.vehicle_id IN (:...ids)', { ids })
      .andWhere("b.status = 'completed'")
      .groupBy('b.vehicle_id')
      .getRawMany<{ vehicleId: number; cnt: string }>();

    const countMap = new Map<number, number>();
    for (const row of rawCounts) {
      countMap.set(Number(row.vehicleId), parseInt(row.cnt, 10) || 0);
    }

    candidates.sort((a, b) => {
      const ca = countMap.get(a.id) ?? 0;
      const cb = countMap.get(b.id) ?? 0;
      if (cb !== ca) return cb - ca;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });

    return candidates.slice(0, 5).map((v) =>
      serializeVehicle(v, {
        completedBookingCount: countMap.get(v.id) ?? 0,
      }),
    );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed.';
      return { error: msg };
    }
  }
}
