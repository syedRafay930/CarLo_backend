import { Repository } from 'typeorm';
import { Bookings } from 'src/entities/entities/Bookings';

export interface CheckAvailabilityInput {
  vehicleId: number;
  pickupDate: string;
  returnDate: string;
}

export interface CheckAvailabilityResult {
  available: boolean;
  message: string;
}

export class CheckAvailabilityTool {
  constructor(private readonly bookingRepo: Repository<Bookings>) {}

  async run(input: CheckAvailabilityInput): Promise<CheckAvailabilityResult> {
    try {
      const pickup = new Date(input.pickupDate);
      const ret = new Date(input.returnDate);

      if (
        !Number.isFinite(pickup.getTime()) ||
        !Number.isFinite(ret.getTime()) ||
        ret <= pickup
      ) {
        return {
          available: false,
          message:
            'Invalid date range: pickup and return must be valid ISO datetimes and return must be after pickup.',
        };
      }

      const overlapCount = await this.bookingRepo
        .createQueryBuilder('b')
        .where('b.vehicle_id = :vehicleId', { vehicleId: input.vehicleId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: ['confirmed', 'in_progress', 'pending'],
        })
        .andWhere('b.pickupDate < :ret', { ret })
        .andWhere('b.returnDate > :pickup', { pickup })
        .getCount();

      if (overlapCount > 0) {
        return {
          available: false,
          message:
            'This vehicle already has an overlapping booking (pending, confirmed, or in progress) in that period.',
        };
      }

      return {
        available: true,
        message:
          'No overlapping pending, confirmed, or in-progress bookings for those dates.',
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Availability check failed.';
      return {
        available: false,
        message: msg,
      };
    }
  }
}
