import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestCatalogDto } from './dto/create-test-catalog.dto';
import { UpdateTestCatalogDto } from './dto/update-test-catalog.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TestCatalogService {
    private readonly logger = new Logger(TestCatalogService.name);

    constructor(private prisma: PrismaService) { }

    async create(createTestCatalogDto: CreateTestCatalogDto) {
        // Check if a test with the same name already exists
        const existingTest = await this.prisma.test_catalog.findFirst({
            where: {
                testName: createTestCatalogDto.testName,
            },
        });

        if (existingTest) {
            throw new BadRequestException(
                `A test catalog with the name "${createTestCatalogDto.testName}" already exists.`
            );
        }

        return await this.prisma.$transaction(async (tx) => {
            return await tx.test_catalog.create({
                data: createTestCatalogDto,
            });
        });
    }



    async findAll() {
        try {
            return await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.findMany({
                    where: {
                        isDeleted: false,
                    },
                });
            });
        } catch (error) {
            this.logger.error(`Error fetching test catalogs: ${error.message}`);
            throw error;
        }
    }

    async findOne(id: string) {
        try {
            const testCatalog = await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                });
            });

            if (!testCatalog) {
                throw new NotFoundException(`Test catalog with ID ${id} not found`);
            }

            return testCatalog;
        } catch (error) {
            this.logger.error(`Error fetching test catalog: ${error.message}`);
            throw error;
        }
    }

    async update(id: string, updateTestCatalogDto: UpdateTestCatalogDto) {
        try {
            const testCatalog = await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                });
            });

            if (!testCatalog) {
                throw new NotFoundException(`Test catalog with ID ${id} not found`);
            }

            return await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.update({
                    where: { id },
                    data: updateTestCatalogDto,
                });
            });
        } catch (error) {
            this.logger.error(`Error updating test catalog: ${error.message}`);
            throw error;
        }
    }

    async remove(id: string) {
        try {
            const testCatalog = await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.findFirst({
                    where: {
                        id,
                        isDeleted: false,
                    },
                });
            });

            if (!testCatalog) {
                throw new NotFoundException(`Test catalog with ID ${id} not found`);
            }

            return await this.prisma.$transaction(async (tx) => {
                return await tx.test_catalog.update({
                    where: { id },
                    data: { isDeleted: true },
                });
            });
        } catch (error) {
            this.logger.error(`Error deleting test catalog: ${error.message}`);
            throw error;
        }
    }
} 