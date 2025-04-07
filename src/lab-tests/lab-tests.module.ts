import { Module } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { LabTestsController } from './lab-tests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LabTestsController],
    providers: [LabTestsService],
    exports: [LabTestsService],
})
export class LabTestsModule { } 