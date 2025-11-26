import { IsString, IsNotEmpty, IsInt } from "class-validator";

export class AddFMRoleDto {
    @IsString()
    @IsNotEmpty()
    role_name: string;

    @IsInt()
    @IsNotEmpty()
    fleet_id: number
}