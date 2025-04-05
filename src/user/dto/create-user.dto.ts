import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsInt,
  Min,
  Max,
  IsOptional,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { UserType } from '../../auth/decorators/roles.decorator';
import { CreateAddressDto } from '../../address/dto/create-address.dto';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsUUID()
  labId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
