import { IsString, IsNotEmpty } from "class-validator";

export class AddRoleDto {
    @IsString()
    @IsNotEmpty()
    role_name: string;
}