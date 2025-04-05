import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Address line 1 is required' })
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  landmark?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  state?: string;

  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  country?: string;

  @IsString()
  @IsNotEmpty({ message: 'postalCode is required' })
  postalCode?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
