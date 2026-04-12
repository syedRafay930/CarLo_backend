import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagerVehicleDocuments } from 'src/entities/entities/FleetManagerVehicleDocuments';
import { VehicleRatings } from 'src/entities/entities/VehicleRatings';
import { CreateVehicleDto } from './dto/create_vehicle.dto';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { VehicleDocumentType } from './dto/upload_vehicle_documents.dto';
import { EditVehicleDto } from './dto/edit_vehicle.dto';
import { DynamicPricingService } from 'src/DynamicPricing/dynamic-pricing.service';
// import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(FleetManagerVehicles)
    private vehiclesRepository: Repository<FleetManagerVehicles>,

    @InjectRepository(FleetManagerVehicleDocuments)
    private documentRepository: Repository<FleetManagerVehicleDocuments>,

    @InjectRepository(VehicleRatings)
    private vehicleRatingsRepository: Repository<VehicleRatings>,
    private dynamicPricingService: DynamicPricingService,
    // private subscriptionService: SubscriptionService,
  ) {}

  async createVehicle(
    userId: number,
    fmId: number,
    createVehicleDto: CreateVehicleDto,
  ) {
    // 1. check subscription(for future)

    // 2. save vehicle
    const newVehicle = this.vehiclesRepository.create({
      vehicleType: createVehicleDto.vehicleType,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      licensePlate: createVehicleDto.licensePlate,
      chassisNumber: createVehicleDto.chassisNumber,
      color: createVehicleDto.color,
      seatingCapacity: createVehicleDto.seatingCapacity,
      transmissionType: createVehicleDto.transmissionType,
      fuelType: createVehicleDto.fuelType,
      mileageKm: createVehicleDto.mileageKm,
      driverServiceOption: createVehicleDto.driverServiceOption,
      selfDriveBaseRate: createVehicleDto.selfDriveBaseRate,
      driverIncludedRate: createVehicleDto.driverIncludedRate,
      driverHoursIncluded: createVehicleDto.driverHoursIncluded,
      pricingModel: createVehicleDto.pricingModel,
      lateReturnChargePerHour: createVehicleDto.lateReturnChargePerHour,
      fuelChargePerKmIfEmpty: createVehicleDto.fuelChargePerKmIfEmpty,
      latenightOfferFlatFee: createVehicleDto.latenightOfferFlatFee,
      isInsured: createVehicleDto.isInsured,
      vehicleStatus: createVehicleDto.vehicleStatus,
      isApprovedByAdmin: false,
      approvalStatus: 'Available',
      isDeleted: false,
      createdAt: new Date(),
      fleetManager: { id: fmId },
      createdBy: { id: userId },
    });

    const savedVehicle = await this.vehiclesRepository.save(newVehicle);
    return savedVehicle;
  }

  async uploadVehicleDocuments(
    vehicleId: number,
    files: Express.Multer.File[],
    documentTypes: string[],
  ) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file));
    const uploadedResults = await Promise.all(uploadPromises);

    const documentEntities = uploadedResults.map((uploaded, index) => {
      const docTypeString = documentTypes[index];
      return this.documentRepository.create({
        vehicle: vehicle,
        docType: docTypeString as VehicleDocumentType,
        documentUrl: uploaded.secure_url,
        verificationStatus: 'pending',
        createdAt: new Date(),
      });
    });

    // 4. **AI/OCR Trigger**
    // Background worker ko call karein taake woh Google Vision API se OCR shuru kare
    // Misal: this.aiVerificationService.triggerOcr(docEntity.id, uploaded.secure_url);

    // Saare documents ko database mein save karein
    const savedDocuments = await this.documentRepository.save(documentEntities);

    return savedDocuments.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      status: doc.verificationStatus,
      url: doc.documentUrl,
    }));
  }

  async updateVehicle(
    userId: number,
    vehicleId: number,
    editVehicleDto: EditVehicleDto,
  ) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId },
      relations: ['fleetManager', 'createdBy', 'updatedBy'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    Object.assign(vehicle, {
      ...editVehicleDto,
      updatedAt: new Date(),
      updatedBy: { id: userId },
    });

    // 3. Save updated vehicle
    const updatedVehicle = await this.vehiclesRepository.save(vehicle);
    return updatedVehicle;
  }

  async getAllVehiclesByFM(
    fmId: number,
    page: number,
    limit: number,
    make?: string,
    status?: string,
    isApprovedByAdmin?: boolean,
    approvalStatus?: string,
    driverServiceOption?: string,
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    minPrice?: number,
    maxPrice?: number,
    vehicleType?: string,
    color?: string,
    seatingCapacity?: number,
    fuelType?: string,
    pricingModel?: string,
  ) {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const safePage = Math.max(1, Math.floor(parsedPage));
    const safeLimit = Math.max(1, Math.floor(parsedLimit));
    const skip = (safePage - 1) * safeLimit;

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.fleetManager.id = :fmId', { fmId });

    queryBuilder.leftJoinAndSelect(
      'vehicle.fleetManagerVehicleDocuments',
      'coverImage',
      'coverImage.docType = :docType',
      { docType: 'image_coverimg' },
    );

    queryBuilder.leftJoinAndSelect('vehicle.vehicleRatings', 'rating');

    if (make) {
      queryBuilder.andWhere('vehicle.make ILIKE :make', { make: `%${make}%` });
    }

    if (status) {
      queryBuilder.andWhere('vehicle.vehicleStatus = :status', { status });
    }

    if (driverServiceOption) {
      queryBuilder.andWhere(
        'vehicle.driverServiceOption = :driverServiceOption',
        { driverServiceOption },
      );
    }

    if (isApprovedByAdmin !== undefined) {
      const isApproved = isApprovedByAdmin === true;
      queryBuilder.andWhere('vehicle.isApprovedByAdmin = :isApproved', {
        isApproved,
      });
    }

    if (approvalStatus) {
      queryBuilder.andWhere('vehicle.approvalStatus = :approvalStatus', {
        approvalStatus,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.licensePlate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // NEW FILTERS:
    if (minPrice !== undefined) {
      queryBuilder.andWhere('vehicle.selfDriveBaseRate >= :minPrice', {
        minPrice,
      });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('vehicle.selfDriveBaseRate <= :maxPrice', {
        maxPrice,
      });
    }

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicleType = :vehicleType', {
        vehicleType,
      });
    }

    if (color) {
      queryBuilder.andWhere('vehicle.color ILIKE :color', {
        color: `%${color}%`,
      });
    }

    if (seatingCapacity !== undefined) {
      queryBuilder.andWhere('vehicle.seatingCapacity >= :seatingCapacity', {
        seatingCapacity,
      });
    }

    if (fuelType) {
      queryBuilder.andWhere('vehicle.fuelType = :fuelType', { fuelType });
    }

    if (pricingModel) {
      queryBuilder.andWhere('vehicle.pricingModel = :pricingModel', {
        pricingModel,
      });
    }

    queryBuilder.orderBy('vehicle.createdAt', sortOrder).skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const cleanedData = data.map((vehicle) => {
      const vehicleWithRelations = vehicle as any;
      const coverImage = vehicleWithRelations.fleetManagerVehicleDocuments?.[0]?.documentUrl || null;

      const ratingsArray = vehicleWithRelations.vehicleRatings || [];
      const totalRatingSum = ratingsArray.reduce((sum, review) => sum + review.rating, 0);
      const reviewCount = ratingsArray.length;
      const averageRating = reviewCount > 0 ? totalRatingSum / reviewCount : 0;

      return {
        ...vehicle,
        coverImageUrl: coverImage,
        averageRating: parseFloat(averageRating.toFixed(1)),
        reviewCount: reviewCount,
        fleetManagerVehicleDocuments: undefined,
        vehicleRatings: undefined,
      };
    });

    return {
      data: cleanedData,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Public catalog: all fleets, only vehicles that are listed for rent.
   * DB uses vehicleStatus "available" (not "active"); must be admin-approved.
   */
  async getPublicCatalogVehicles(
    page: number,
    limit: number,
    make?: string,
    driverServiceOption?: string,
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    minPrice?: number,
    maxPrice?: number,
    vehicleType?: string,
    color?: string,
    seatingCapacity?: number,
    fuelType?: string,
    pricingModel?: string,
  ) {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const safePage = Math.max(1, Math.floor(parsedPage));
    const safeLimit = Math.max(1, Math.floor(parsedLimit));
    const skip = (safePage - 1) * safeLimit;

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.isDeleted = :isDel', { isDel: false })
      .andWhere('vehicle.isApprovedByAdmin = :isAp', { isAp: true })
      .andWhere('vehicle.vehicleStatus = :vstat', { vstat: 'available' });

    queryBuilder.leftJoinAndSelect(
      'vehicle.fleetManagerVehicleDocuments',
      'coverImage',
      'coverImage.docType = :docType',
      { docType: 'image_coverimg' },
    );

    queryBuilder.leftJoinAndSelect('vehicle.vehicleRatings', 'rating');

    if (make) {
      queryBuilder.andWhere('vehicle.make ILIKE :make', { make: `%${make}%` });
    }

    if (driverServiceOption) {
      queryBuilder.andWhere(
        'vehicle.driverServiceOption = :driverServiceOption',
        { driverServiceOption },
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.licensePlate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('vehicle.selfDriveBaseRate >= :minPrice', {
        minPrice,
      });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('vehicle.selfDriveBaseRate <= :maxPrice', {
        maxPrice,
      });
    }

    if (vehicleType) {
      queryBuilder.andWhere('vehicle.vehicleType = :vehicleType', {
        vehicleType,
      });
    }

    if (color) {
      queryBuilder.andWhere('vehicle.color ILIKE :color', {
        color: `%${color}%`,
      });
    }

    if (seatingCapacity !== undefined) {
      queryBuilder.andWhere('vehicle.seatingCapacity >= :seatingCapacity', {
        seatingCapacity,
      });
    }

    if (fuelType) {
      queryBuilder.andWhere('vehicle.fuelType = :fuelType', { fuelType });
    }

    if (pricingModel) {
      queryBuilder.andWhere('vehicle.pricingModel = :pricingModel', {
        pricingModel,
      });
    }

    queryBuilder
      .orderBy('vehicle.createdAt', sortOrder)
      .skip(skip)
      .take(safeLimit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const ids = data.map((v) => v.id);
    const priceMap =
      await this.dynamicPricingService.getActivePricingMapForVehicleIds(ids);

    const cleanedData = data.map((vehicle) => {
      const vehicleWithRelations = vehicle as any;
      const coverImage =
        vehicleWithRelations.fleetManagerVehicleDocuments?.[0]?.documentUrl ||
        null;

      const ratingsArray = vehicleWithRelations.vehicleRatings || [];
      const totalRatingSum = ratingsArray.reduce(
        (sum, review) => sum + review.rating,
        0,
      );
      const reviewCount = ratingsArray.length;
      const averageRating = reviewCount > 0 ? totalRatingSum / reviewCount : 0;

      const baseRaw = vehicle.selfDriveBaseRate;
      const baseRate =
        typeof baseRaw === 'string'
          ? parseFloat(baseRaw)
          : Number(baseRaw ?? 0);

      let effectiveDailyRate = Number.isFinite(baseRate) ? baseRate : 0;
      let dynamicPricingActive = false;
      let priceAdjustmentPercent = 0;

      if (this.dynamicPricingService.isDynamicPricingEnabled(vehicle)) {
        const row = priceMap.get(vehicle.id);
        if (row) {
          const adj = parseFloat(String(row.newDailyRate ?? baseRate));
          if (Number.isFinite(adj)) effectiveDailyRate = adj;
          dynamicPricingActive = true;
          try {
            const o = JSON.parse(row.engineBreakdownJson || '{}') as {
              multiplierPercent?: number;
            };
            priceAdjustmentPercent = o.multiplierPercent ?? 0;
          } catch {
            priceAdjustmentPercent = 0;
          }
        }
      }

      return {
        ...vehicle,
        coverImageUrl: coverImage,
        averageRating: parseFloat(averageRating.toFixed(1)),
        reviewCount: reviewCount,
        fleetManagerVehicleDocuments: undefined,
        vehicleRatings: undefined,
        effectiveDailyRate,
        dynamicPricingActive,
        priceAdjustmentPercent,
      };
    });

    return {
      data: cleanedData,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getAllDocsByVehicleId(
    fmId: number,
    vehicleId: number,
    page = 1,
    limit = 10,
    verificationStatus: string,
    search: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const skip = (page - 1) * limit;
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId, fleetManager: { id: fmId } },
    });

    if (!vehicle) {
      throw new NotFoundException(
        'Vehicle not found or does not belong to this Fleet Manager.',
      );
    }
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where('document.vehicle.id = :vehicleId', { vehicleId })
      .leftJoinAndSelect('document.verifiedBy', 'admin')
      .orderBy('document.createdAt', sortOrder);

    if (verificationStatus) {
      queryBuilder.andWhere('document.verificationStatus = :status', {
        status: verificationStatus,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(document.docType ILIKE :search OR document.extractedData ILIKE :search OR document.documentUrl ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVehicleById(vehicleId: number) {
    const desiredDocTypes = [
      'image_coverimg',
      'image_exterior_front',
      'image_exterior_back',
      'image_interior',
    ];

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.id = :vehicleId', { vehicleId })
      .leftJoinAndSelect('vehicle.fleetManager', 'fm', 'fm.isDelete = false')
      .leftJoinAndSelect(
        'vehicle.fleetManagerVehicleDocuments',
        'images',
        'images.docType IN (:...docTypes)',
        { docTypes: desiredDocTypes },
      )
      .leftJoinAndSelect('vehicle.vehicleRatings', 'rating')
      .leftJoinAndSelect('rating.user', 'user')
      //.andWhere('vehicle.isApprovedByAdmin = true')
      .andWhere('vehicle.vehicleStatus = :status', { status: 'available' });

    const vehicle = await queryBuilder.getOne();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found.`);
    }

    const images = (vehicle.fleetManagerVehicleDocuments || []).map((doc) => ({
      type: doc.docType,
      url: doc.documentUrl,
    }));

    const recentRatings = (vehicle.vehicleRatings || []).slice(0, 2); // Get only the first 2 reviews

    const rating = recentRatings.map((rev) => ({
      name: rev.user?.firstName + ' ' + rev.user?.lastName,
      rating: rev.rating,
      comment: rev.comment,
      createdAt: rev.createdAt,
    }));

    const ratingsArray = vehicle.vehicleRatings || [];
    const totalRatingSum = ratingsArray.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    const reviewCount = ratingsArray.length;
    const averageRating = reviewCount > 0 ? totalRatingSum / reviewCount : 0;


    return {
      ...vehicle,
      fleetManagerName: vehicle.fleetManager.name,
      fleetCity: vehicle.fleetManager?.city ?? null,
      fleetCountry: vehicle.fleetManager?.country ?? null,
      images: images,
      ratings: rating,
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount: reviewCount,
      vehicleRatings: undefined,
      fleetManager: undefined,
      fleetManagerVehicleDocuments: undefined,
      user: undefined,
    };
  }

  async getReviewsByVehicleId(vehicleId: number) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId },
      relations: ['vehicleRatings', 'vehicleRatings.user'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found.`);
    }

    const reviews = (vehicle.vehicleRatings || []).map((rev) => ({
      name: rev.user?.firstName + ' ' + rev.user?.lastName,
      rating: rev.rating,
      comment: rev.comment,
      createdAt: rev.createdAt,
    }));
    const ratingsArray = vehicle.vehicleRatings || [];
    const totalRatingSum = ratingsArray.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    const reviewCount = ratingsArray.length;
    const averageRating = reviewCount > 0 ? totalRatingSum / reviewCount : 0;


    return {
      vehicleId: vehicle.id,
      reviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount: reviewCount,
    };
  }

  async createVehicleReview(
    vehicleId: number,
    clientId: number,
    dto: { rating: number; review?: string },
  ) {
    const uid = Number(clientId);
    const existingCount = await this.vehicleRatingsRepository
      .createQueryBuilder('r')
      .where('r.user_id = :uid', { uid })
      .andWhere('r.vehicle_id = :vid', { vid: vehicleId })
      .getCount();

    if (existingCount > 0) {
      throw new ConflictException(
        'You have already reviewed this vehicle. Each customer can submit one review per vehicle.',
      );
    }

    const vehicle = await this.vehiclesRepository.findOne({
      where: {
        id: vehicleId,
        isDeleted: false,
        isApprovedByAdmin: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const row = this.vehicleRatingsRepository.create({
      rating: dto.rating,
      comment: dto.review ?? null,
      user: { id: uid },
      vehicle: { id: vehicleId },
    });

    try {
      const saved = await this.vehicleRatingsRepository.save(row);
      return {
        id: saved.id,
        rating: saved.rating,
        review: saved.comment,
        createdAt: saved.createdAt,
      };
    } catch (err) {
      const driverCode =
        err instanceof QueryFailedError
          ? (err as QueryFailedError & { driverError?: { code?: string } })
              .driverError?.code
          : undefined;
      const anyCode =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      const msg = err instanceof Error ? err.message : String(err);
      if (
        driverCode === '23505' ||
        anyCode === '23505' ||
        msg.includes('duplicate key') ||
        msg.includes('uq_user_vehicle_rating')
      ) {
        throw new ConflictException(
          'You have already reviewed this vehicle.',
        );
      }
      throw err;
    }
  }
}
