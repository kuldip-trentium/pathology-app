import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { TestStatus } from './enums/test-status.enum';

@Injectable()
export class TestsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createTestDto: CreateTestDto) {
        const { labId, details } = createTestDto;

        // Verify lab exists
        const lab = await this.prisma.labs.findUnique({
            where: { id: labId },
        });

        if (!lab) {
            throw new NotFoundException('Lab not found');
        }

        // Create test with details in a transaction
        return this.prisma.$transaction(async (prisma) => {
            const test = await prisma.tests.create({
                data: {
                    userId,
                    labId,
                    details: {
                        create: details.map((detail) => ({
                            catalogId: detail.catalogId,
                            remark: detail.remark,
                        })),
                    },
                },
                include: {
                    details: {
                        include: {
                            testCatalog: true,
                        },
                    },
                    lab: true,
                },
            });

            return test;
        });
    }

    async findAll(userId: string) {
        return this.prisma.tests.findMany({
            where: { userId },
            include: {
                details: {
                    include: {
                        testCatalog: true,
                    },
                },
                lab: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(userId: string, id: string) {
        const test = await this.prisma.tests.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                details: {
                    include: {
                        testCatalog: true,
                    },
                },
                lab: true,
            },
        });

        if (!test) {
            throw new NotFoundException('Test not found');
        }

        return test;
    }

    async updateStatus(userId: string, id: string, status: TestStatus) {
        const test = await this.prisma.tests.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!test) {
            throw new NotFoundException('Test not found');
        }

        return this.prisma.tests.update({
            where: { id },
            data: { status },
            include: {
                details: {
                    include: {
                        testCatalog: true,
                    },
                },
                lab: true,
            },
        });
    }

    async remove(userId: string, id: string) {
        const test = await this.prisma.tests.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!test) {
            throw new NotFoundException('Test not found');
        }

        // Delete test (cascade will handle test details)
        await this.prisma.tests.delete({
            where: { id },
        });

        return { message: 'Test deleted successfully' };
    }
} 