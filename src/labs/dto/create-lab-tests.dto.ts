import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabTestDto {
    @ApiProperty({
        example: 'cat_12345',
        description: 'The catalog ID that links to a predefined test catalog',
    })
    @IsString()
    catalogId: string;

    @ApiProperty({
        example: 150.0,
        description: 'The price of the lab test (must be 0 or more)',
    })
    @IsNumber()
    @Min(0)
    price: number;
}
