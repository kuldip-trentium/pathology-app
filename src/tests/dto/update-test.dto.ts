import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TestStatus } from '../enums/test-status.enum';

export class UpdateTestStatusDto {
    @ApiProperty({
        enum: TestStatus,
        description: 'Status of the test',
        example: TestStatus.PENDING
    })
    @IsEnum(TestStatus, {
        message: 'Invalid test status. Status must be one of: PENDING, COLLECTION_PENDING, COLLECTED, PROCESSING, COMPLETED, CANCELLED'
    })
    status: TestStatus;
} 