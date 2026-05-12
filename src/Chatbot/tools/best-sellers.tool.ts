import { In, Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { Bookings } from 'src/entities/entities/Bookings';
import { serializeVehicle, SerializedVehicle } from './vehicle-serializer';

export interface BestSellersInput {
  vehicleType?: string;
  city?: string;
  serviceType?: 'self_drive' | 'with_driver';
}

export class GetBestSellersTool {
  constructor(
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
    private readonly bookingRepo: Repository<Bookings>,
  ) {}

  async run(input: BestSellersInput): Promise<SerializedVehicle[] | { error: string }> {
    try {
      const qb = this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.vehicle', 'v')
      .innerJoin('v.fleetManager', 'fm')
      .select('v.id', 'vehicleId')
      .addSelect('COUNT(b.id)', 'bookingCount')
      .where('b.status IN (:...statuses)', {
        statuses: ['completed', 'confirmed'],
      })
      .andWhere('v.isApprovedByAdmin = :ap', { ap: true })
      .andWhere('v.vehicleStatus = :vs', { vs: 'available' })
      .andWhere('v.isDeleted = :del', { del: false });

    if (input.serviceType === 'self_drive') {
      qb.andWhere("v.driverServiceOption IN ('self_drive_only', 'both')");
    }
    if (input.serviceType === 'with_driver') {
      qb.andWhere("v.driverServiceOption IN ('driver_included', 'both')");
    }

    if (input.city?.trim()) {
      qb.andWhere('fm.city ILIKE :city', { city: `%${input.city.trim()}%` });
    }

    if (input.vehicleType?.trim()) {
      qb.andWhere('v.vehicleType = :vt', { vt: input.vehicleType.trim() });
    }

    qb.groupBy('v.id').orderBy('COUNT(b.id)', 'DESC').limit(5);

    const rows = await qb.getRawMany<{
      vehicleId: number;
      bookingCount: string;
    }>();

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((r) => Number(r.vehicleId));
    const vehicles = await this.vehicleRepo.find({
      where: { id: In(ids) },
      relations: ['fleetManager'],
    });

    const order = new Map(ids.map((id, i) => [id, i]));
    vehicles.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const countById = new Map(
      rows.map((r) => [Number(r.vehicleId), parseInt(r.bookingCount, 10) || 0]),
    );

    return vehicles.map((v) =>
      serializeVehicle(v, {
        relevantBookingCount: countById.get(v.id) ?? 0,
      }),
    );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Best sellers lookup failed.';
      return { error: msg };
    }
  }
}
