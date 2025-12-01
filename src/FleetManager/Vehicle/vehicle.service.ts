import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { FleetManagerVehicleDocuments } from 'src/entities/entities/FleetManagerVehicleDocuments';
import { CreateVehicleDto } from './dto/create_vehicle.dto';
import { uploadToCloudinary } from 'src/Cloudinary/cloudinary.helper';
import { VehicleDocumentType } from './dto/upload_vehicle_documents.dto';
import { EditVehicleDto } from './dto/edit_vehicle.dto';
// import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(FleetManagerVehicles)
    private vehiclesRepository: Repository<FleetManagerVehicles>,

    @InjectRepository(FleetManagerVehicleDocuments)
    private documentRepository: Repository<FleetManagerVehicleDocuments>,
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
    page: number = 1,
    limit: number = 10,
    status?: string,
    isApprovedByAdmin?: boolean,
    driverServiceOption?: string,
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const skip = (page - 1) * limit;

    // 1. Base QueryBuilder
    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.fleetManager.id = :fmId', { fmId });

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

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.licensePlate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('vehicle.createdAt', sortOrder).skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
}
