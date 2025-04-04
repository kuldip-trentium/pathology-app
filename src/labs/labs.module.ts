import { Module } from '@nestjs/common';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { OpenCageService } from '../address/open-cage.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    PrismaModule
  ],
  controllers: [LabsController],
  providers: [LabsService, PrismaService, OpenCageService],
  exports: [LabsService]
})
export class LabsModule { }
