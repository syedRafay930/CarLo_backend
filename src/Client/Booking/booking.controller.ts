import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create_booking.dto';
import { ClientJwtBlacklistGuard } from '../Auth/guards/jwt.guard';
import { ProcessPaymentDto } from './dto/process_payment.dto';

@Controller('client/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('create')
  async createBooking(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingService.createBooking(
      createBookingDto,
      req.user.client_email,
    );

    return {
      message:
        'Booking request sent successfully to Fleet Manager for approval.',
      booking,
    };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get()
  async getClientBookings(@Req() req) {
    const bookings = await this.bookingService.getClientBookings(
      req.user.client_id,
    );
    return { bookings };
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Post('pay')
  async payForBooking(
    @Req() req: any,
    @Body() processPaymentDto: ProcessPaymentDto,
  ) {
    const clientId = req.user.client_id;
    return this.bookingService.processInitialPayment(
      clientId,
      processPaymentDto.bookingId,
      processPaymentDto.paymentMethod,
    );
  }

  @UseGuards(ClientJwtBlacklistGuard)
  @Get('slip/:bookingId')
  async getPaymentSlip(@Req() req: any, @Param('bookingId') bookingId: number) {
    return this.bookingService.getBookingSlip(bookingId, req.user.client_id);
  }
}
