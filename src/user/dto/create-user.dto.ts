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
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../../auth/decorators/roles.decorator';
import { CreateAddressDto } from '../../address/dto/create-address.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'securePass123', minLength: 6, description: 'Password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserType, example: UserType.CLIENT, description: 'User type (1=Admin, 2=Manager, 3=Staff, 4=Client)' })
  @IsInt()
  @Min(1)
  @Max(4)
  @IsNotEmpty()
  userType: UserType;

  @ApiPropertyOptional({
    example: ['f12a3c45-678d-90ab-cdef-1234567890ab', 'a34b3c45-111d-99ab-cdef-0987654321aa'],
    description: 'Optional list of Lab IDs (UUIDs)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @Type(() => String)
  labIds?: string[];

  @ApiPropertyOptional({ type: () => CreateAddressDto, description: 'Optional address information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
