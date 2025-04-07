import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({
    example: '123 Main St',
    description: 'Primary address line',
  })
  @IsString()
  @IsNotEmpty({ message: 'Address line 1 is required' })
  addressLine1: string;

  @ApiPropertyOptional({
    example: 'Suite 4B',
    description: 'Secondary address line (optional)',
  })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'Near Central Park',
    description: 'Landmark or nearby location (optional)',
  })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City name',
  })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @ApiProperty({
    example: 'New York',
    description: 'State name',
  })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  country: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal or ZIP code',
  })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  postalCode: string;

  @ApiPropertyOptional({
    example: 40.7128,
    description: 'Latitude coordinate (optional)',
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    example: -74.0060,
    description: 'Longitude coordinate (optional)',
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
