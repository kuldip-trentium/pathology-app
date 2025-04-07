import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressDto } from '../../address/dto/create-address.dto';

export class UpdateLabDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address?: CreateAddressDto;

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    managerIds?: string[];
} 