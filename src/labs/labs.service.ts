import { Injectable, ForbiddenException, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserType } from '../auth/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';
import { ManageLabDto } from './dto/manage-lab.dto';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { OpenCageService } from '../address/open-cage.service';
import { CreateAddressDto } from '../address/dto/create-address.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class LabsService {
    constructor(
        private prisma: PrismaService,
        private openCageService: OpenCageService,
    ) { }

    private async checkUserAccess(userId: string, allowedTypes: UserType[]) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId, isDeleted: false },
            select: { userType: true }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!allowedTypes.includes(user.userType)) {
            throw new UnauthorizedException('You do not have permission to perform this action');
        }

        return user;
    }

    private async checkLabManagerAccess(userId: string, labId: string) {
        const labManager = await this.prisma.labManagers.findFirst({
            where: {
                labId: labId,
                userId: userId
            }
        });

        if (!labManager) {
            throw new UnauthorizedException('You do not have permission to manage this lab');
        }
    }

    async create(createLabDto: CreateLabDto, currentUser: any) {
        const { address, ...labData } = createLabDto;

        // Check if lab already has an address
        const existingLab = await this.prisma.labs.findFirst({
            where: { name: labData.name },
            include: { addresses: true }
        });

        if (existingLab && existingLab.addresses.length > 0) {
            throw new BadRequestException('Lab already has an address');
        }

        const lab = await this.prisma.labs.create({
            data: {
                ...labData,
                addresses: address ? {
                    create: {
                        ...address,
                        entityType: 'LAB',
                        state: address.state || '',
                        country: address.country || '',
                        postalCode: address.postalCode || ''
                    }
                } : undefined
            },
            include: {
                addresses: true,
                managers: true
            }
        });

        return lab;
    }

    private async geocodeAddress(address: CreateAddressDto) {
        const addressString = `${address.addressLine1}, ${address.city}, ${address.state}, ${address.country}`;
        const geocodeResult = await this.openCageService.geocodeAddress(addressString);
        return {
            latitude: geocodeResult.location.lat,
            longitude: geocodeResult.location.lng
        };
    }

    async findAll(currentUser: any) {
        const labs = await this.prisma.labs.findMany({
            include: {
                addresses: true,
                managers: true
            }
        });

        return labs;
    }

    async findOne(id: string, currentUser: any) {
        const lab = await this.prisma.labs.findUnique({
            where: { id },
            include: {
                addresses: true,
                managers: true
            }
        });

        if (!lab) {
            throw new NotFoundException('Lab not found');
        }

        const isManager = lab.managers.some(manager => manager.userId === currentUser.id);
        if (!isManager && currentUser.userType !== 1) {
            throw new UnauthorizedException('You are not authorized to view this lab');
        }

        return lab;
    }

    async update(id: string, updateLabDto: UpdateLabDto, currentUser: any) {
        const { address, ...labData } = updateLabDto;

        const lab = await this.prisma.labs.update({
            where: { id },
            data: {
                ...labData,
                addresses: address ? {
                    updateMany: {
                        where: { entityId: id, entityType: 'LAB' },
                        data: {
                            ...address,
                            state: address.state || '',
                            country: address.country || '',
                            postalCode: address.postalCode || ''
                        }
                    }
                } : undefined
            },
            include: {
                addresses: true,
                managers: true
            }
        });

        return lab;
    }

    async remove(id: string, currentUser: CurrentUser) {
        if (currentUser.userType !== UserType.ADMIN) {
            throw new ForbiddenException('Only admins can delete labs');
        }

        const lab = await this.prisma.labs.findUnique({
            where: { id }
        });

        if (!lab) {
            throw new NotFoundException(`Lab with ID ${id} not found`);
        }

        return this.prisma.labs.delete({
            where: { id }
        });
    }

    async addManager(labId: string, userId: string, currentUser: CurrentUser) {
        if (currentUser.userType !== UserType.ADMIN) {
            throw new ForbiddenException('Only admins can add lab managers');
        }

        const lab = await this.prisma.labs.findUnique({
            where: { id: labId }
        });

        if (!lab) {
            throw new NotFoundException(`Lab with ID ${labId} not found`);
        }

        const user = await this.prisma.users.findUnique({
            where: { id: userId, isDeleted: false }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const labManager = await this.prisma.labManagers.findFirst({
            where: {
                labId: labId,
                userId: userId
            }
        });

        if (labManager) {
            throw new ConflictException('User is already a manager of this lab');
        }

        return this.prisma.labManagers.create({
            data: {
                labId: labId,
                userId: userId
            }
        });
    }
}