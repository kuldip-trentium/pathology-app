import { IsEmail, IsInt, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsNotEmpty()
    @IsInt()
    userType: number;
}

export class UpdateUserDto {
    @IsString()
    name?: string;

    @IsEmail()
    email?: string;

    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password?: string;

    @IsInt()
    userType?: number;
}
