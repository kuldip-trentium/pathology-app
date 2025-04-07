import { PartialType } from '@nestjs/swagger';
import { CreateTestCatalogDto } from './create-test-catalog.dto';

export class UpdateTestCatalogDto extends PartialType(CreateTestCatalogDto) { } 