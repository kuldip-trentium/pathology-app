import { IsString, IsEmail, IsNotEmpty, MinLength, IsEnum, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '../decorators/roles.decorator';
import { CreateAddressDto } from '../../address/dto/create-address.dto';

export class RegisterDto {
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

    @IsEnum(UserType, { message: 'Invalid user type' })
    @IsNotEmpty({ message: 'User type is required' })
    userType: UserType;

    @ValidateNested()
    @Type(() => CreateAddressDto)
    @IsNotEmpty({ message: 'Address is required for client users' })
    address: CreateAddressDto;
} 