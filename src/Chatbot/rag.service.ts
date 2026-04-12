import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagers } from 'src/entities/entities/FleetManagers';

@Injectable()
export class RagService {
  constructor(
    @InjectRepository(FleetManagerVehicles)
    private vehicleRepo: Repository<FleetManagerVehicles>,
    @InjectRepository(FleetManagers)
    private fleetRepo: Repository<FleetManagers>,
  ) {}

  async getVehicleContext(userMessage: string): Promise<string> {
    const message = userMessage.toLowerCase();

    const cityKeywords: Record<string, string[]> = {
      karachi: ['karachi', 'کراچی'],
      lahore: ['lahore', 'لاہور'],
      islamabad: ['islamabad', 'اسلام آباد'],
      rawalpindi: ['rawalpindi'],
      peshawar: ['peshawar'],
      quetta: ['quetta'],
    };

    let matchedCity: string | null = null;
    for (const [city, keys] of Object.entries(cityKeywords)) {
      if (keys.some((k) => message.includes(k))) {
        matchedCity = city;
        break;
      }
    }

    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.fleetManager', 'fm')
      .where('v.isApprovedByAdmin = :ap', { ap: true })
      .andWhere('v.vehicleStatus = :st', { st: 'available' })
      .andWhere('v.isDeleted = :del', { del: false })
      .orderBy('v.createdAt', 'DESC')
      .take(10);

    if (matchedCity) {
      qb.andWhere('LOWER(fm.city) LIKE :city', {
        city: `%${matchedCity}%`,
      });
    }

    const vehicles = await qb.getMany();

    if (vehicles.length === 0) {
      return matchedCity
        ? `No vehicles are currently listed for ${matchedCity} in the system snapshot. You may still browse other cities in the app.`
        : 'No vehicles are currently available in the system.';
    }

    const vehicleLines = vehicles.map((v) => {
      const selfDrive = v.selfDriveBaseRate
        ? `Self-drive: PKR ${Number(v.selfDriveBaseRate)}/day`
        : '';
      const withDriver = v.driverIncludedRate
        ? `With driver: PKR ${Number(v.driverIncludedRate)}/day`
        : '';
      const pricing = [selfDrive, withDriver].filter(Boolean).join(', ');
      const fm = v.fleetManager;
      return (
        `- ${v.year} ${v.make} ${v.model} (${v.vehicleType}, ${v.color ?? 'N/A'}, ` +
        `${v.seatingCapacity} seats, ${v.transmissionType}, ${v.fuelType}) | ` +
        `${pricing || 'Pricing on request'} | Fleet: ${fm?.name ?? 'Unknown'} | ` +
        `City: ${fm?.city ?? 'N/A'}`
      );
    });

    return `Available vehicles on CarLo:\n${vehicleLines.join('\n')}`;
  }

  async getFleetContext(): Promise<string> {
    const fleets = await this.fleetRepo.find({
      where: [
        { isActive: true, isDelete: false },
        { isActive: true, isDelete: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (fleets.length === 0) {
      return 'No active fleet partners currently.';
    }

    const fleetLines = fleets.map(
      (f) =>
        `- ${f.name} (${f.type}) | City: ${f.city ?? 'N/A'}, ${f.country ?? 'N/A'} | ` +
        `Contact: ${f.email ?? 'N/A'}`,
    );

    return `CarLo partner fleets:\n${fleetLines.join('\n')}`;
  }
}
