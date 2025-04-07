import {
    IsString,
    IsEmail,
    IsNotEmpty,
    MinLength,
    IsEnum,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../decorators/roles.decorator';
import { CreateAddressDto } from '../../address/dto/create-address.dto';

export class RegisterDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @ApiProperty({
        example: 'john@example.com',
        description: 'Valid email address of the user',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        example: 'StrongPassword123',
        description: 'User password (min 8 characters)',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

    @ApiProperty({
        enum: UserType,
        example: UserType.CLIENT,
        description: 'Role of the user',
    })
    @IsEnum(UserType, { message: 'Invalid user type' })
    @IsNotEmpty({ message: 'User type is required' })
    userType: UserType;

    @ApiProperty({
        type: () => CreateAddressDto,
        description: 'Address details for client users',
    })
    @ValidateNested()
    @Type(() => CreateAddressDto)
    @IsNotEmpty({ message: 'Address is required for client users' })
    address: CreateAddressDto;
}
