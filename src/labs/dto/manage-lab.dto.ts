import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ManageLabDto {
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    userId: string;

    @IsNotEmpty()
    @IsString()
    @IsUUID()
    labId: string;
} 