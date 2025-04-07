import { Injectable, ForbiddenException, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserType } from '../auth/decorators/roles.decorator';
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
        const { address, managerIds, labTests = [], ...labData } = createLabDto;

        // Ensure address is provided
        if (!address) {
            throw new BadRequestException('Address is mandatory for lab creation');
        }

        // Ensure managers are provided
        if (!managerIds || managerIds.length === 0) {
            throw new BadRequestException('At least one manager is required for lab creation');
        }

        // Check if lab with the same name already exists
        const existingLab = await this.prisma.labs.findFirst({
            where: {
                OR: [
                    { email: labData.email },
                    { phoneNumber: labData.phoneNumber },
                    { name: labData.name }
                ],
            },
        });

        if (existingLab) {
            throw new BadRequestException('Email or phone number or name already exists');
        }


        if (existingLab) {
            throw new BadRequestException('Lab with this name already exists');
        }

        // Validate that all managers exist
        const managers = await this.prisma.users.findMany({
            where: {
                id: {
                    in: managerIds
                },
                isDeleted: false
            }
        });

        if (managers.length !== managerIds.length) {
            throw new BadRequestException('One or more manager IDs are invalid');
        }

        if (labTests.length > 0) {
            const catalogIds = labTests.map(test => test.catalogId);
            const existingCatalogs = await this.prisma.test_catalog.findMany({
                where: { id: { in: catalogIds } }
            });

            if (existingCatalogs.length !== catalogIds.length) {
                throw new BadRequestException('One or more catalog IDs are invalid');
            }
        }

        // Use a transaction to ensure lab, address, and managers are created properly
        return this.prisma.$transaction(async (prisma) => {
            // First create the lab
            const lab = await prisma.labs.create({
                data: {
                    ...labData
                }
            });

            // Then create the address separately
            const addressData = {
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || null,
                landmark: address.landmark || null,
                city: address.city,
                state: address.state,
                country: address.country,
                postalCode: address.postalCode,
                entityId: lab.id,
                entityType: 'LAB'
            };

            // Get geocoding data if not provided
            if (!address.latitude || !address.longitude) {
                try {
                    const geocodeResult = await this.geocodeAddress(address);
                    addressData['latitude'] = geocodeResult.latitude;
                    addressData['longitude'] = geocodeResult.longitude;
                } catch (error) {
                    console.error('Geocoding failed:', error);
                    // Continue without geocoding data
                }
            } else {
                addressData['latitude'] = address.latitude;
                addressData['longitude'] = address.longitude;
            }

            // Create the address
            const createdAddress = await prisma.address.create({
                data: addressData
            });

            // Create lab managers
            await prisma.labManagers.createMany({
                data: managerIds.map(managerId => ({
                    labId: lab.id,
                    userId: managerId
                }))
            });

            if (labTests.length > 0) {
                await prisma.lab_tests.createMany({
                    data: labTests.map(test => ({
                        labId: lab.id,
                        catalogId: test.catalogId,
                        price: test.price
                    })),
                    skipDuplicates: true
                });
            }

            // Return the lab with its address and managers
            return {
                ...lab,
                address: createdAddress,
                managers: await prisma.labManagers.findMany({
                    where: { labId: lab.id },
                    include: { user: true }
                }),
                labTests: await prisma.lab_tests.findMany({
                    where: { labId: lab.id },
                    include: { catalog: true }
                })
            };
        });
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
            where: { isDeleted: false },
            include: {
                addresses: true,
                managers: true
            }
        });

        return labs;
    }

    async findOne(id: string, currentUser: any) {
        const lab = await this.prisma.labs.findUnique({
            where: { id, isDeleted: false },
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
        const { address, managerIds, ...labData } = updateLabDto;

        // Check if lab exists
        const existingLab = await this.prisma.labs.findUnique({
            where: { id }
        });

        if (!existingLab) {
            throw new NotFoundException(`Lab with ID ${id} not found`);
        }

        // If managers are being updated, validate them
        if (managerIds) {
            if (managerIds.length === 0) {
                throw new BadRequestException('At least one manager is required');
            }

            const managers = await this.prisma.users.findMany({
                where: {
                    id: {
                        in: managerIds
                    },
                    isDeleted: false
                }
            });

            if (managers.length !== managerIds.length) {
                throw new BadRequestException('One or more manager IDs are invalid');
            }
        }

        // Use a transaction to ensure lab, address, and managers are updated properly
        return this.prisma.$transaction(async (prisma) => {
            // Update the lab
            const updatedLab = await prisma.labs.update({
                where: { id },
                data: labData
            });

            // If address is provided, update it
            if (address) {
                // Find existing address
                const existingAddress = await prisma.address.findFirst({
                    where: {
                        entityId: id,
                        entityType: 'LAB'
                    }
                });

                if (existingAddress) {
                    // Update existing address
                    const addressData = {
                        addressLine1: address.addressLine1,
                        addressLine2: address.addressLine2 || null,
                        landmark: address.landmark || null,
                        city: address.city,
                        state: address.state,
                        country: address.country,
                        postalCode: address.postalCode
                    };

                    // Get geocoding data if not provided
                    if (!address.latitude || !address.longitude) {
                        try {
                            const geocodeResult = await this.geocodeAddress(address);
                            addressData['latitude'] = geocodeResult.latitude;
                            addressData['longitude'] = geocodeResult.longitude;
                        } catch (error) {
                            console.error('Geocoding failed:', error);
                            // Continue without geocoding data
                        }
                    } else {
                        addressData['latitude'] = address.latitude;
                        addressData['longitude'] = address.longitude;
                    }

                    const updatedAddress = await prisma.address.update({
                        where: { id: existingAddress.id },
                        data: addressData
                    });

                    // If managers are being updated
                    if (managerIds) {
                        // Delete existing managers
                        await prisma.labManagers.deleteMany({
                            where: { labId: id }
                        });

                        // Create new managers
                        await prisma.labManagers.createMany({
                            data: managerIds.map(managerId => ({
                                labId: id,
                                userId: managerId
                            }))
                        });
                    }

                    // Return updated lab with address and managers
                    return {
                        ...updatedLab,
                        address: updatedAddress,
                        managers: await prisma.labManagers.findMany({
                            where: { labId: id },
                            include: { user: true }
                        })
                    };
                } else {
                    // Create new address if none exists
                    const addressData = {
                        addressLine1: address.addressLine1,
                        addressLine2: address.addressLine2 || null,
                        landmark: address.landmark || null,
                        city: address.city,
                        state: address.state,
                        country: address.country,
                        postalCode: address.postalCode,
                        entityId: id,
                        entityType: 'LAB'
                    };

                    // Get geocoding data if not provided
                    if (!address.latitude || !address.longitude) {
                        try {
                            const geocodeResult = await this.geocodeAddress(address);
                            addressData['latitude'] = geocodeResult.latitude;
                            addressData['longitude'] = geocodeResult.longitude;
                        } catch (error) {
                            console.error('Geocoding failed:', error);
                            // Continue without geocoding data
                        }
                    } else {
                        addressData['latitude'] = address.latitude;
                        addressData['longitude'] = address.longitude;
                    }

                    const newAddress = await prisma.address.create({
                        data: addressData
                    });

                    // If managers are being updated
                    if (managerIds) {
                        // Delete existing managers
                        await prisma.labManagers.deleteMany({
                            where: { labId: id }
                        });

                        // Create new managers
                        await prisma.labManagers.createMany({
                            data: managerIds.map(managerId => ({
                                labId: id,
                                userId: managerId
                            }))
                        });
                    }

                    // Return updated lab with address and managers
                    return {
                        ...updatedLab,
                        address: newAddress,
                        managers: await prisma.labManagers.findMany({
                            where: { labId: id },
                            include: { user: true }
                        })
                    };
                }
            }

            // If only managers are being updated (no address update)
            if (managerIds) {
                // Delete existing managers
                await prisma.labManagers.deleteMany({
                    where: { labId: id }
                });

                // Create new managers
                await prisma.labManagers.createMany({
                    data: managerIds.map(managerId => ({
                        labId: id,
                        userId: managerId
                    }))
                });

                // Return updated lab with managers
                return {
                    ...updatedLab,
                    managers: await prisma.labManagers.findMany({
                        where: { labId: id },
                        include: { user: true }
                    })
                };
            }

            // If no address or manager updates, just return the updated lab
            return updatedLab;
        });
    }

    async remove(id: string, currentUser: CurrentUser) {
        if (currentUser.userType !== UserType.ADMIN) {
            throw new ForbiddenException('Only admins can delete labs');
        }

        const lab = await this.prisma.labs.findUnique({
            where: { id },
        });

        if (!lab) {
            throw new NotFoundException(`Lab with ID ${id} not found`);
        }

        return this.prisma.$transaction(async (prisma) => {
            // Delete lab managers
            await prisma.labManagers.deleteMany({
                where: { labId: id },
            });

            // Delete lab address
            await prisma.address.deleteMany({
                where: {
                    entityId: id,
                    entityType: 'LAB',
                },
            });

            // Soft delete the lab by updating isDeleted to true
            await prisma.labs.update({
                where: { id },
                data: {
                    isDeleted: true,
                },
            });

            return {
                statusCode: 200,
                message: 'Lab soft deleted successfully',
            };
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