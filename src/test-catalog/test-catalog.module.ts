import { Module } from '@nestjs/common';
import { TestCatalogService } from './test-catalog.service';
import { TestCatalogController } from './test-catalog.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TestCatalogController],
    providers: [TestCatalogService],
    exports: [TestCatalogService],
})
export class TestCatalogModule { } 