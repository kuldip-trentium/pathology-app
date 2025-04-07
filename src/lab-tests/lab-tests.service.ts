import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { UpdateLabTestDto } from './dto/update-lab-test.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class LabTestsService {
    private readonly logger = new Logger(LabTestsService.name);

    constructor(private prisma: PrismaService) { }

    async create(createLabTestDto: CreateLabTestDto) {

        return await this.prisma.$transaction(async (tx) => {
            // Verify lab exists
            const lab = await tx.labs.findFirst({
                where: {
                    id: createLabTestDto.labId,
                    isDeleted: false,
                },
            });

            if (!lab) {
                throw new NotFoundException(`Lab with ID ${createLabTestDto.labId} not found`);
            }

            // Verify test catalog exists
            const testCatalog = await tx.test_catalog.findFirst({
                where: {
                    id: createLabTestDto.catalogId,
                    isDeleted: false,
                },
            });

            if (!testCatalog) {
                throw new NotFoundException(`Test catalog with ID ${createLabTestDto.catalogId} not found`);
            }
            const existingLabTest = await tx.lab_tests.findFirst({
                where: {
                    labId: createLabTestDto.labId,
                    catalogId: createLabTestDto.catalogId,
                    isDeleted: false, // if you're using soft delete
                },
            });

            if (existingLabTest) {
                throw new BadRequestException(
                    `Test "${testCatalog.testName}" is already added to lab "${lab.name}".`
                );
            }

            return await tx.lab_tests.create({
                data: createLabTestDto,
            });
        });

    }

    async findAll(paginationDto: PaginationDto) {
        try {
            const { page = 1, limit = 10 } = paginationDto;
            const skip = (page - 1) * limit;

            const [tests, total] = await this.prisma.$transaction([
                this.prisma.lab_tests.findMany({
                    where: {
                        isDeleted: false,
                    },
                    skip,
                    take: limit,
                    include: {
                        lab: true,
                        catalog: true,
                    },
                }),
                this.prisma.lab_tests.count({
                    where: {
                        isDeleted: false,
                    },
                }),
            ]);

            return {
                data: tests,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            this.logger.error(`Error fetching lab tests: ${error.message}`);
            throw error;
        }
    }


    async findOne(id: string) {
        try {
            const labTest = await this.prisma.$transaction(async (tx) => {
                return await tx.lab_tests.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                    include: {
                        lab: true,
                        catalog: true,
                    },
                });
            });

            if (!labTest) {
                throw new NotFoundException(`Lab test with ID ${id} not found`);
            }

            return labTest;
        } catch (error) {
            this.logger.error(`Error fetching lab test: ${error.message}`);
            throw error;
        }
    }

    async update(id: string, updateLabTestDto: UpdateLabTestDto) {
        try {
            const labTest = await this.prisma.$transaction(async (tx) => {
                return await tx.lab_tests.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                });
            });

            if (!labTest) {
                throw new NotFoundException(`Lab test with ID ${id} not found`);
            }

            // If labId is being updated, verify the new lab exists
            if (updateLabTestDto.labId) {
                const lab = await this.prisma.$transaction(async (tx) => {
                    return await tx.labs.findFirst({
                        where: {
                            id: updateLabTestDto.labId,
                            isDeleted: false,
                        },
                    });
                });

                if (!lab) {
                    throw new NotFoundException(`Lab with ID ${updateLabTestDto.labId} not found`);
                }
            }

            // If catalogId is being updated, verify the new test catalog exists
            if (updateLabTestDto.catalogId) {
                const testCatalog = await this.prisma.$transaction(async (tx) => {
                    return await tx.test_catalog.findFirst({
                        where: {
                            id: updateLabTestDto.catalogId,
                            isDeleted: false,
                        },
                    });
                });

                if (!testCatalog) {
                    throw new NotFoundException(`Test catalog with ID ${updateLabTestDto.catalogId} not found`);
                }
            }

            return await this.prisma.$transaction(async (tx) => {
                return await tx.lab_tests.update({
                    where: { id },
                    data: updateLabTestDto,
                    include: {
                        lab: true,
                        catalog: true,
                    },
                });
            });
        } catch (error) {
            this.logger.error(`Error updating lab test: ${error.message}`);
            throw error;
        }
    }

    async remove(id: string) {
        try {
            const labTest = await this.prisma.$transaction(async (tx) => {
                return await tx.lab_tests.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                });
            });

            if (!labTest) {
                throw new NotFoundException(`Lab test with ID ${id} not found`);
            }

            return await this.prisma.$transaction(async (tx) => {
                return await tx.lab_tests.update({
                    where: { id },
                    data: { isDeleted: true },
                });
            });
        } catch (error) {
            this.logger.error(`Error deleting lab test: ${error.message}`);
            throw error;
        }
    }
    async findByLabId(labId: string) {
        try {
            return await this.prisma.lab_tests.findMany({
                where: {
                    labId,
                    isDeleted: false,
                },
                include: {
                    lab: true,
                    catalog: true,
                },
            });
        } catch (error) {
            this.logger.error(`Error fetching lab tests by labId: ${error.message}`);
            throw error;
        }
    }

} 