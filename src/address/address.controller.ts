import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, UnauthorizedException } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { OpenCageService } from './open-cage.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
    user: {
        sub: string;
        [key: string]: any;
    };
}

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
    constructor(
        private readonly addressService: AddressService,
        private readonly openCageService: OpenCageService,
    ) { }

    @Post()
    create(@Body() createAddressDto: CreateAddressDto, @Req() req: RequestWithUser) {
        const userId = req.user.sub;
        return this.addressService.create(createAddressDto, userId, 'USER');
    }

    @Get()
    findAll() {
        return this.addressService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.addressService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
        return this.addressService.update(id, updateAddressDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.addressService.remove(id);
    }

    @Get('geocode/:address')
    async geocodeAddress(@Param('address') address: string) {
        return this.openCageService.geocodeAddress(address);
    }

    @Get('reverse-geocode')
    async reverseGeocode(
        @Query('lat') lat: number,
        @Query('lng') lng: number,
    ) {
        return this.openCageService.reverseGeocode(lat, lng);
    }
} 