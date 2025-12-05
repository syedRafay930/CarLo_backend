import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

enum PaymentMethod {
  cash = 'cash',
  credit_card = 'credit_card',
}

export class ProcessPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  bookingId: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
