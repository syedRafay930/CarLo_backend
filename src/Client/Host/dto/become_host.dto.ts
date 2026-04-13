import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class BecomeHostDto {
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  /** Must match the client account password; stored on the linked FM user so FM portal login works. */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
