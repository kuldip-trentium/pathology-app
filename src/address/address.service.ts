import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { OpenCageService } from './open-cage.service';

@Injectable()
export class AddressService {
    constructor(
        private prisma: PrismaService,
        private openCageService: OpenCageService,
    ) { }

    async create(createAddressDto: CreateAddressDto, entityId: string, entityType: string, userType: number) {
        // For non-client users and labs, check if they already have an address
        if (entityType === 'USER' && userType !== 4) {
            const existingAddress = await this.prisma.address.findFirst({
                where: {
                    entityId,
                    entityType
                }
            });

            if (existingAddress) {
                throw new BadRequestException('Entity can only have one address');
            }
        }

        // If coordinates are not provided, geocode the address
        if (!createAddressDto.latitude || !createAddressDto.longitude) {
            const geocoded = await this.openCageService.geocodeAddress(
                `${createAddressDto.addressLine1}, ${createAddressDto.city}, ${createAddressDto.state}, ${createAddressDto.country}`
            );
            createAddressDto.latitude = geocoded.location.lat;
            createAddressDto.longitude = geocoded.location.lng;
        }

        return this.prisma.address.create({
            data: {
                ...createAddressDto,
                entityId,
                entityType,
                state: createAddressDto.state || '',
                country: createAddressDto.country || '',
                postalCode: createAddressDto.postalCode || ''
            }
        });
    }

    async findAll() {
        return this.prisma.address.findMany();
    }

    async findOne(id: string) {
        return this.prisma.address.findUnique({
            where: { id }
        });
    }

    async update(id: string, updateAddressDto: UpdateAddressDto) {
        // If coordinates are not provided, geocode the address
        if (!updateAddressDto.latitude || !updateAddressDto.longitude) {
            const geocoded = await this.openCageService.geocodeAddress(
                `${updateAddressDto.addressLine1}, ${updateAddressDto.city}, ${updateAddressDto.state}, ${updateAddressDto.country}`
            );
            updateAddressDto.latitude = geocoded.location.lat;
            updateAddressDto.longitude = geocoded.location.lng;
        }

        return this.prisma.address.update({
            where: { id },
            data: {
                ...updateAddressDto,
                state: updateAddressDto.state || '',
                country: updateAddressDto.country || '',
                postalCode: updateAddressDto.postalCode || ''
            }
        });
    }

    async remove(id: string) {
        return this.prisma.address.delete({
            where: { id }
        });
    }
} 