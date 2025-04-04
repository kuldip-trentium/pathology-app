import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLabDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    address: string;

    @IsOptional()
    @IsString()
    managerId?: string;
}

export class UpdateLabDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    managerId?: string;
}

export class AssignManagerDto {
    @IsNotEmpty()
    @IsString()
    managerId: string;
}
