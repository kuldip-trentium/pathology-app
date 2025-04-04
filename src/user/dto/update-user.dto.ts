import { IsString, IsEmail, IsOptional, MinLength, IsInt, Min, Max } from 'class-validator';
import { UserType } from '../../auth/decorators/roles.decorator';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @IsInt()
    @Min(1)
    @Max(4)
    @IsOptional()
    userType?: UserType;
} 