import { IsString, IsEmail, IsNotEmpty, MinLength, IsInt, Min, Max } from 'class-validator';
import { UserType } from '../../auth/decorators/roles.decorator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsInt()
    @Min(1)
    @Max(4)
    @IsNotEmpty()
    userType: UserType;
} 