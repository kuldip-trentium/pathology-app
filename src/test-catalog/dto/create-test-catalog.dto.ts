import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestCatalogDto {
    @ApiProperty({
        example: 'Complete Blood Count',
        description: 'Name of the test to be added to the catalog',
    })
    @IsString()
    testName: string;

    @ApiPropertyOptional({
        example: 'This test measures different components of blood.',
        description: 'Optional description for the test',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: 500,
        description: 'Price of the test in currency units',
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    price: number;
}
