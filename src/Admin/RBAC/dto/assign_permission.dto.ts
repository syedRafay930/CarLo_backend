import { IsBoolean, IsInt } from 'class-validator';

export class AssignPermissionDto {
  @IsInt()
  role_id: number;

  @IsInt()
  module_id: number;

  @IsBoolean()
  is_enable: boolean;
}
