import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';

export interface SerializedVehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  seatingCapacity: number;
  transmissionType: string;
  fuelType: string;
  pricingModel: string;
  selfDriveBaseRatePkr: number | null;
  driverIncludedRatePkr: number | null;
  driverServiceOption: string;
  city: string | null;
  fleetManagerName: string | null;
  completedBookingCount?: number;
  relevantBookingCount?: number;
}

export function serializeVehicle(
  v: FleetManagerVehicles,
  extras?: {
    city?: string | null;
    completedBookingCount?: number;
    relevantBookingCount?: number;
  },
): SerializedVehicle {
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    vehicleType: v.vehicleType,
    seatingCapacity: v.seatingCapacity,
    transmissionType: v.transmissionType,
    fuelType: v.fuelType,
    pricingModel: v.pricingModel,
    selfDriveBaseRatePkr:
      v.selfDriveBaseRate != null ? Number(v.selfDriveBaseRate) : null,
    driverIncludedRatePkr:
      v.driverIncludedRate != null ? Number(v.driverIncludedRate) : null,
    driverServiceOption: v.driverServiceOption,
    city: extras?.city ?? v.fleetManager?.city ?? null,
    fleetManagerName: v.fleetManager?.name ?? null,
    completedBookingCount: extras?.completedBookingCount,
    relevantBookingCount: extras?.relevantBookingCount,
  };
}
