import { IsString, IsEmail, IsOptional, MinLength, IsInt, Min, Max, ValidateNested, IsUUID, IsArray, ArrayUnique, ArrayNotEmpty } from 'class-validator';
import { UserType } from '../../auth/decorators/roles.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/address/dto/create-address.dto';
import { Type } from 'class-transformer';

export class UpdateUserDto {
    @ApiPropertyOptional({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({
        example: 'john.doe@example.com',
        description: 'Email address of the user',
    })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({
        example: 'password123',
        description: 'Password with minimum 6 characters',
    })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({
        example: 2,
        description: 'User type: 1 = Admin, 2 = Manager, 3 = Staff, 4 = Client',
        enum: UserType,
    })
    @IsInt()
    @Min(1)
    @Max(4)
    @IsOptional()
    userType?: UserType;

    @ApiPropertyOptional({
        example: ['f12a3c45-678d-90ab-cdef-1234567890ab'],
        description: 'Optional list of Lab IDs (UUIDs)',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsUUID('all', { each: true })
    labIds?: string[];


    @ApiPropertyOptional({ type: () => CreateAddressDto, description: 'Optional address information' })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address?: CreateAddressDto;
} 