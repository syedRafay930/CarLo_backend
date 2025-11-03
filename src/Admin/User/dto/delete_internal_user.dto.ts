import {
    IsNotEmpty,
    IsBoolean
} from 'class-validator';

export class DeleteInternalUserDto {
  @IsNotEmpty()
  @IsBoolean()
  isdelete: boolean
}