
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    @IsEmail()
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
}
