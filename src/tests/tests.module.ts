import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
    controllers: [TestsController],
    providers: [TestsService, PrismaService],
    exports: [TestsService],
})
export class TestsModule { } 