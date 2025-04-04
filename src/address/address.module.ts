import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenCageService } from './open-cage.service';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';

@Module({
    controllers: [AddressController],
    providers: [AddressService, PrismaService, OpenCageService],
    exports: [AddressService, OpenCageService]
})
export class AddressModule { } 