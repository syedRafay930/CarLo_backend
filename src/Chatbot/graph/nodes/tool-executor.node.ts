import { Repository } from 'typeorm';
import { Users } from 'src/entities/entities/Users';
import { Bookings } from 'src/entities/entities/Bookings';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';
import { BookingService } from 'src/Client/Booking/booking.service';
import type { ChatStateAnnotation } from '../chat-state';
import { SearchVehiclesTool } from '../../tools/search-vehicles.tool';
import { GetNearestVehiclesTool } from '../../tools/nearest-vehicles.tool';
import { GetBestSellersTool } from '../../tools/best-sellers.tool';
import { CreateBookingTool } from '../../tools/create-booking.tool';
import { CheckAvailabilityTool } from '../../tools/check-availability.tool';

function isVehicleListError(
  out: unknown,
): out is { error: string } {
  return (
    typeof out === 'object' &&
    out !== null &&
    'error' in out &&
    typeof (out as { error: unknown }).error === 'string' &&
    !Array.isArray(out)
  );
}

export interface ToolExecutorDeps {
  vehicleRepo: Repository<FleetManagerVehicles>;
  bookingRepo: Repository<Bookings>;
  usersRepo: Repository<Users>;
  bookingService: BookingService;
  faqContent: string;
}

export function createToolExecutorNode(deps: ToolExecutorDeps) {
  const search = new SearchVehiclesTool(deps.vehicleRepo, deps.bookingRepo);
  const nearest = new GetNearestVehiclesTool(
    deps.vehicleRepo,
    deps.bookingRepo,
  );
  const best = new GetBestSellersTool(deps.vehicleRepo, deps.bookingRepo);
  const createBooking = new CreateBookingTool(
    deps.bookingService,
    deps.vehicleRepo,
  );
  const availability = new CheckAvailabilityTool(deps.bookingRepo);

  return async (
    state: typeof ChatStateAnnotation.State,
  ): Promise<Partial<typeof ChatStateAnnotation.Update>> => {
    const input = state.toolInput ?? {};
    const email = state.userEmail?.trim();

    try {
      switch (state.intent) {
        case 'SEARCH_VEHICLES': {
          if (state.toolKey === 'nearest_vehicles') {
            const out = await nearest.run({
              city: String(input.city ?? ''),
              vehicleType: input.vehicleType as string | undefined,
            });
            if (isVehicleListError(out)) {
              return { toolOutput: { ...out, tool: 'nearest_vehicles' } };
            }
            return { toolOutput: { vehicles: out, tool: 'nearest_vehicles' } };
          }
          if (state.toolKey === 'best_sellers') {
            const out = await best.run({
              city: input.city as string | undefined,
              vehicleType: input.vehicleType as string | undefined,
            });
            if (isVehicleListError(out)) {
              return { toolOutput: { ...out, tool: 'best_sellers' } };
            }
            return { toolOutput: { vehicles: out, tool: 'best_sellers' } };
          }
          if (state.toolKey === 'check_availability') {
            const out = await availability.run({
              vehicleId: Number(input.vehicleId),
              pickupDate: String(input.pickupDate ?? ''),
              returnDate: String(input.returnDate ?? ''),
            });
            return { toolOutput: { ...out, tool: 'check_availability' } };
          }
          const out = await search.run({
            city: input.city as string | undefined,
            vehicleType: input.vehicleType as string | undefined,
            minSeats: input.minSeats as number | undefined,
            fuelType: input.fuelType as string | undefined,
            serviceType: input.serviceType as
              | 'self_drive'
              | 'with_driver'
              | undefined,
          });
          if (isVehicleListError(out)) {
            return { toolOutput: { ...out, tool: 'search_vehicles' } };
          }
          return { toolOutput: { vehicles: out, tool: 'search_vehicles' } };
        }
        case 'BOOK_VEHICLE': {
          const result = await createBooking.run(
            {
              vehicleId: input.vehicleId as number,
              pickupDate: input.pickupDate as string,
              returnDate: input.returnDate as string,
              pickupLocation: input.pickupLocation as string,
              returnLocation: input.returnLocation as string,
              serviceType: input.serviceType as
                | 'self_drive'
                | 'with_driver'
                | undefined,
              priceModel: input.priceModel as
                | 'per_day'
                | 'per_km'
                | 'per_hr'
                | undefined,
            },
            email,
          );
          return {
            toolOutput: result,
            missingFields:
              result.type === 'MISSING_INFO' ? result.missingFields : [],
          };
        }
        case 'CHECK_BOOKING': {
          if (!email) {
            return {
              toolOutput: {
                type: 'AUTH_REQUIRED',
                message:
                  'Please sign in and share your account email so I can look up your bookings.',
              },
            };
          }
          const user = await deps.usersRepo.findOne({
            where: { email: email.trim() },
          });
          if (!user) {
            return {
              toolOutput: {
                type: 'NOT_FOUND',
                message: 'No CarLo account found for that email.',
              },
            };
          }
          const rows = await deps.bookingRepo
            .createQueryBuilder('b')
            .innerJoin('b.user', 'u')
            .leftJoinAndSelect('b.vehicle', 'vehicle')
            .where('u.id = :uid', { uid: user.id })
            .orderBy('b.createdAt', 'DESC')
            .take(8)
            .getMany();
          const bookings = rows.map((b) => ({
            bookingCode: b.bookingCode,
            status: b.status,
            pickupDate: b.pickupDate?.toISOString?.() ?? String(b.pickupDate),
            returnDate: b.returnDate?.toISOString?.() ?? String(b.returnDate),
            pickupLocation: b.pickupLocation,
            returnLocation: b.returnLocation,
            initialTotalCharge: b.initialTotalCharge,
            vehicle:
              b.vehicle != null
                ? `${b.vehicle.make} ${b.vehicle.model}`
                : undefined,
          }));
          return { toolOutput: { bookings, tool: 'check_bookings' } };
        }
        case 'FAQ': {
          return {
            toolOutput: {
              type: 'FAQ',
              faqContent: deps.faqContent,
            },
          };
        }
        case 'GENERAL':
          return { toolOutput: null };
        default:
          return { toolOutput: null };
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Something went wrong fetching data.';
      return { toolOutput: { type: 'ERROR', message } };
    }
  };
}
