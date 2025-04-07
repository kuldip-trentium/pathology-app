import { IsString, IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestDetailDto {
    @ApiProperty({ description: 'UUID of the catalog' })
    @IsUUID()
    catalogId: string;

    @ApiPropertyOptional({ description: 'Optional remark for the test detail' })
    @IsString()
    @IsOptional()
    remark?: string;
}

export class CreateTestDto {
    @ApiProperty({ description: 'UUID of the lab' })
    @IsUUID()
    labId: string;

    @ApiProperty({
        type: [CreateTestDetailDto],
        description: 'Array of test detail objects'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTestDetailDto)
    details: CreateTestDetailDto[];
}
