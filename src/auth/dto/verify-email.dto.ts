import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
    @ApiProperty({
        example: '4f8d7e2c-b91a-4d02-99e6-6f5f2b8b3d75',
        description: 'Verification token sent to the user\'s email',
    })
    @IsString()
    @IsNotEmpty({ message: 'Token is required' })
    token: string;
}
