import { IsNotEmpty, IsString, IsIn, IsInt } from 'class-validator';

export class SaveFcmTokenDto {
  @IsInt()
  user_id: number;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsIn(['web', 'android', 'ios'])
  platform: string;
}
