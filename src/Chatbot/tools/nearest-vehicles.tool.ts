import { Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Bookings } from 'src/entities/entities/Bookings';
import { serializeVehicle, SerializedVehicle } from './vehicle-serializer';

export interface NearestVehiclesInput {
  city: string;
  vehicleType?: string;
}

/**
 * Same availability rules as search, but city is required and matched strictly on fleet manager city.
 */
export class GetNearestVehiclesTool {
  constructor(
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    private readonly bookingRepo: Repository<Bookings>,
  ) {}

  async run(
    input: NearestVehiclesInput,
  ): Promise<SerializedVehicle[] | { error: string }> {
    if (!input.city?.trim()) {
      return { error: 'City is required to find nearest vehicles.' };
    }

    const city = input.city.trim();

    try {
      const qb = this.vehicleRepo
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.fleetManager', 'fm')
        .where('v.isApprovedByAdmin = :ap', { ap: true })
        .andWhere('v.vehicleStatus = :vs', { vs: 'available' })
        .andWhere('v.isDeleted = :del', { del: false })
        .andWhere('fm.city ILIKE :city', { city: `%${city}%` });

      if (input.vehicleType?.trim()) {
        qb.andWhere('v.vehicleType = :vt', { vt: input.vehicleType.trim() });
      }

      const candidates = await qb
        .orderBy('v.createdAt', 'DESC')
        .take(80)
        .getMany();

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
      const msg = e instanceof Error ? e.message : 'Nearest search failed.';
      return { error: msg };
    }
  }
}
