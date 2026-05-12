import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { BookingService } from 'src/Client/Booking/booking.service';
import { CreateBookingDto } from 'src/Client/Booking/dto/create_booking.dto';
import { FleetManagerVehicles } from 'src/entities/entities/FleetManagerVehicles';

export interface CreateBookingToolInput {
  vehicleId: number;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  serviceType: 'self_drive' | 'with_driver';
  priceModel: 'per_day' | 'per_km' | 'per_hr';
  userEmail: string;
}

export type CreateBookingToolResult =
  | {
      type: 'SUCCESS';
      bookingCode: string;
      initialTotalCharge: string;
      vehicleLabel: string;
      pickupDate: string;
      returnDate: string;
      pickupLocation: string;
      returnLocation: string;
    }
  | {
      type: 'MISSING_INFO';
      missingFields: string[];
      error: 'MISSING_INFO';
    }
  | {
      type: 'AUTH_REQUIRED';
      error: 'Authentication required to make a booking.';
    }
  | { type: 'ERROR'; message: string };

export class CreateBookingTool {
  constructor(
    private readonly bookingService: BookingService,
    private readonly vehicleRepo: Repository<FleetManagerVehicles>,
  ) {}

  run(
    input: Partial<CreateBookingToolInput>,
    userEmail?: string,
  ): Promise<CreateBookingToolResult> {
    return this.runAsync(input, userEmail);
  }

  private async runAsync(
    input: Partial<CreateBookingToolInput>,
    userEmail?: string,
  ): Promise<CreateBookingToolResult> {
    const required = [
      'vehicleId',
      'pickupDate',
      'returnDate',
      'pickupLocation',
      'returnLocation',
      'serviceType',
    ] as const;
    const missingBody: string[] = required.filter((f) => {
      const v = input[f as keyof CreateBookingToolInput];
      if (v === undefined || v === null) return true;
      return String(v).trim() === '';
    });

    const rawPrice = input.priceModel as unknown;
    let priceModel: CreateBookingToolInput['priceModel'] | undefined =
      typeof rawPrice === 'string' && rawPrice.trim() !== ''
        ? (rawPrice.trim() as CreateBookingToolInput['priceModel'])
        : undefined;

    if (
      priceModel === undefined &&
      input.vehicleId != null &&
      Number.isFinite(Number(input.vehicleId))
    ) {
      try {
        const vehicle = await this.vehicleRepo.findOne({
          where: { id: Number(input.vehicleId), isDeleted: false },
        });
        if (vehicle?.pricingModel) {
          priceModel = vehicle.pricingModel;
        }
      } catch {
        /* fall through to missing priceModel */
      }
    }

    if (priceModel === undefined) {
      missingBody.push('priceModel');
    }

    if (missingBody.length > 0) {
      return {
        type: 'MISSING_INFO',
        missingFields: missingBody,
        error: 'MISSING_INFO',
      };
    }

    if (!userEmail?.trim()) {
      return {
        type: 'AUTH_REQUIRED',
        error: 'Authentication required to make a booking.',
      };
    }

    const email = userEmail.trim();
    const serviceType = input.serviceType as 'self_drive' | 'with_driver';

    const dto = {
      vehicleId: input.vehicleId!,
      pickupDate: input.pickupDate!,
      returnDate: input.returnDate!,
      pickupLocation: input.pickupLocation!,
      returnLocation: input.returnLocation!,
      serviceType,
      priceModel: priceModel!,
      Name: 'Chatbot',
      phone: '0000000000',
      cnic: '00000-0000000-0',
    } as CreateBookingDto;

    try {
      const saved = await this.bookingService.createBooking(dto, email);
      const vehicleLabel = `Vehicle #${input.vehicleId}`;

      return {
        type: 'SUCCESS',
        bookingCode: saved.bookingCode,
        initialTotalCharge: String(saved.initialTotalCharge),
        vehicleLabel,
        pickupDate: saved.pickupDate.toISOString(),
        returnDate: saved.returnDate.toISOString(),
        pickupLocation: saved.pickupLocation,
        returnLocation: saved.returnLocation,
      };
    } catch (e: unknown) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        return { type: 'ERROR', message: e.message };
      }
      const msg =
        e instanceof Error ? e.message : 'Booking could not be created.';
      return { type: 'ERROR', message: msg };
    }
  }
}
