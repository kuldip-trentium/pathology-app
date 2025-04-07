import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabTestDto {
    @ApiProperty({
        example: 'f12a3c45-678d-90ab-cdef-1234567890ab',
        description: 'The UUID of the lab where the test is available',
    })
    @IsString()
    labId: string;

    @ApiProperty({
        example: 'c34b3d67-1234-5678-abcd-9876543210ef',
        description: 'The UUID of the test catalog',
    })
    @IsString()
    catalogId: string;

    @ApiProperty({
        example: 1500,
        description: 'The price of the test in currency units',
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    price: number;
}
