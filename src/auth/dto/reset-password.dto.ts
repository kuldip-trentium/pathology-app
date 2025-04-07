import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({
        example: 'd6f0c9a1-3b8c-4e0f-ae49-2df0a8c7f123',
        description: 'Token received via email for password reset verification',
    })
    @IsString({ message: 'Token must be a string' })
    @IsNotEmpty({ message: 'Token is required' })
    token: string;

    @ApiProperty({
        example: 'StrongPassword123!',
        description: 'The new password to set for the account (minimum 8 characters)',
    })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'New password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    newPassword: string;
}
