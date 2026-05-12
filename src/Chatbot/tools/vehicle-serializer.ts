import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';

export type SerializedVehicle = ReturnType<typeof serializeVehicle>;

export type SerializedVehicleExtras = {
  completedBookingCount?: number;
  relevantBookingCount?: number;
};

export function serializeVehicle(
  v: FleetManagerVehicles,
  extras?: SerializedVehicleExtras,
): object {
  const pricing: Record<string, string> = {};

  if (
    v.driverServiceOption === 'self_drive_only' ||
    v.driverServiceOption === 'both'
  ) {
    pricing.selfDrive = v.selfDriveBaseRate
      ? `PKR ${Number(v.selfDriveBaseRate).toLocaleString()} / ${v.pricingModel.replace('per_', 'per ')}`
      : 'on request';
  }

  if (
    v.driverServiceOption === 'driver_included' ||
    v.driverServiceOption === 'both'
  ) {
    pricing.withDriver = v.driverIncludedRate
      ? `PKR ${Number(v.driverIncludedRate).toLocaleString()} / ${v.pricingModel.replace('per_', 'per ')}`
      : 'on request';
  }

  return {
    id: v.id,
    name: `${v.year} ${v.make} ${v.model}`,
    type: v.vehicleType,
    color: v.color ?? 'N/A',
    seats: v.seatingCapacity,
    transmission: v.transmissionType,
    fuel: v.fuelType,
    driverServiceOption: v.driverServiceOption,
    pricing,
    fleet: v.fleetManager?.name ?? 'Unknown',
    city: v.fleetManager?.city ?? 'N/A',
    ...(extras?.completedBookingCount != null && {
      completedBookingCount: extras.completedBookingCount,
    }),
    ...(extras?.relevantBookingCount != null && {
      relevantBookingCount: extras.relevantBookingCount,
    }),
  };
}
