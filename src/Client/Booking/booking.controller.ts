import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create_booking.dto';

@Controller('client/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingService.createBooking(createBookingDto);

    return {
      message:
        'Booking request sent successfully to Fleet Manager for approval.',
      booking,
    };
  }
}
