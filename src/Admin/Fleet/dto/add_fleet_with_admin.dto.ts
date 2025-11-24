import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddFleetDto } from './add_fleet.dto';
import { AddFleetUserDto } from './add_fleet_user.dto';
export class AddFleetWithUserDto {
  @ValidateNested()
  @Type(() => AddFleetDto)
  fleet: AddFleetDto;

  @ValidateNested()
  @Type(() => AddFleetUserDto)
  user: AddFleetUserDto;
}
