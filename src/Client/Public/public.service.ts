import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetManagers } from 'src/entities/entities/FleetManagers';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(FleetManagers)
    private readonly fleetRepo: Repository<FleetManagers>,
  ) {}

  async getPublicFleets(params: {
    page: number;
    limit: number;
    search?: string;
    city?: string;
    type?: 'individual' | 'shop';
  }) {
    const { page, limit, search, city, type } = params;

    const qb = this.fleetRepo
      .createQueryBuilder('fm')
      .where('fm.isActive = true')
      .andWhere('fm.isDelete = false')
      .loadRelationCountAndMap(
        'fm.totalVehicles',
        'fm.fleetManagerVehicles',
        'v',
        (vqb) =>
          vqb
            .where('v.isApprovedByAdmin = true')
            .andWhere('v.isDeleted = false')
            .andWhere("v.vehicleStatus = 'available'"),
      );

    if (search) {
      qb.andWhere('(fm.name ILIKE :search OR fm.city ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (city) {
      qb.andWhere('fm.city ILIKE :city', { city: `%${city}%` });
    }

    if (type) {
      qb.andWhere('fm.type = :type', { type });
    }

    const total = await qb.getCount();

    const fleets = await qb
      .select([
        'fm.id',
        'fm.name',
        'fm.type',
        'fm.city',
        'fm.address',
        'fm.contact',
        'fm.createdAt',
      ])
      .orderBy('fm.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: fleets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPublicFleetDetail(fleetId: number) {
    const fleet = await this.fleetRepo
      .createQueryBuilder('fm')
      .leftJoinAndSelect(
        'fm.fleetManagerVehicles',
        'v',
        'v.isApprovedByAdmin = true AND v.isDeleted = false',
      )
      .leftJoinAndSelect(
        'v.vehicleDynamicPricings',
        'dp',
        'dp.startDateTime <= NOW() AND dp.endDateTime >= NOW()',
      )
      .leftJoinAndSelect(
        'v.fleetManagerVehicleDocuments',
        'vehicleImages',
        "vehicleImages.docType IN ('image_coverimg', 'image_exterior_front', 'image_exterior_back', 'image_exterior_left', 'image_exterior_right')",
      )
      .leftJoinAndSelect('v.vehicleRatings', 'rating')
      .where('fm.id = :fleetId', { fleetId })
      .andWhere('fm.isActive = true')
      .andWhere('fm.isDelete = false')
      .select([
        // Fleet fields
        'fm.id',
        'fm.name',
        'fm.type',
        'fm.city',
        'fm.address',
        'fm.contact',
        'fm.email',
        'fm.createdAt',
        // Vehicle fields
        'v.id',
        'v.make',
        'v.model',
        'v.year',
        'v.vehicleType',
        'v.color',
        'v.seatingCapacity',
        'v.transmissionType',
        'v.fuelType',
        'v.driverServiceOption',
        'v.selfDriveBaseRate',
        'v.driverIncludedRate',
        'v.pricingModel',
        'v.vehicleStatus',
        'v.isInsured',
        // Dynamic pricing
        'dp.newDailyRate',
        'dp.startDateTime',
        'dp.endDateTime',
        'vehicleImages.documentUrl',
        'vehicleImages.docType',
        'rating.rating',
      ])
      .getOne();

    if (!fleet) throw new NotFoundException('Fleet not found');

    // Har vehicle ka effective price calculate karo
    const vehicles = fleet.fleetManagerVehicles?.map((v) => {
      const activePrice = v.vehicleDynamicPricings?.[0];
      const vAny = v as any;
      const allImages = vAny.fleetManagerVehicleDocuments ?? [];

      // Cover image alag nikalo
      const coverImageUrl =
        allImages.find((img) => img.docType === 'image_coverimg')
          ?.documentUrl ?? null;

      // Exterior images alag nikalo
      const exteriorImages = allImages
        .filter((img) =>
          [
            'image_exterior_front',
            'image_exterior_back',
            'image_exterior_left',
            'image_exterior_right',
          ].includes(img.docType),
        )
        .map((img) => ({
          type: img.docType,
          url: img.documentUrl,
        }));
      const ratings = vAny.vehicleRatings ?? [];
      const averageRating = ratings.length
        ? parseFloat(
            (
              ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
            ).toFixed(1),
          )
        : 0;
      return {
        ...v,
        effectiveRate: activePrice
          ? Number(activePrice.newDailyRate)
          : Number(v.selfDriveBaseRate ?? 0),
        hasDynamicPricing: !!activePrice,
        coverImageUrl,
        exteriorImages, 
        averageRating,
        reviewCount: ratings.length,
        vehicleDynamicPricings: undefined,
        fleetManagerVehicleDocuments: undefined,
        vehicleRatings: undefined,
      };
    });

    return {
      ...fleet,
      fleetManagerVehicles: vehicles,
    };
  }
}
