import {
    IsString,
    IsNotEmpty,
    IsArray,
    ValidateNested,
    Matches,
    IsEmail,
    IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from '../../address/dto/create-address.dto';
import { CreateLabTestDto } from './create-lab-tests.dto';

export class CreateLabDto {
    @ApiProperty({ example: 'Greenwood Diagnostics', description: 'Name of the lab' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '9876543210', description: 'Lab contact phone number (10 digits)' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
    phoneNumber: string;

    @ApiProperty({ example: 'info@greenwoodlabs.com', description: 'Lab contact email address' })
    @IsString()
    @IsNotEmpty()
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @ApiProperty({ description: 'Lab address details' })
    @IsNotEmpty({ message: 'Address is mandatory for lab creation' })
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address: CreateAddressDto;

    @ApiProperty({
        type: [String],
        description: 'List of manager user IDs assigned to the lab',
        example: ['manager-id-1', 'manager-id-2'],
    })
    @IsArray()
    @IsNotEmpty({ message: 'At least one manager is required' })
    @IsString({ each: true })
    managerIds: string[];

    @ApiPropertyOptional({
        type: [CreateLabTestDto],
        description: 'Optional array of lab tests offered by the lab',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLabTestDto)
    labTests?: CreateLabTestDto[];
}
