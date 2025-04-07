import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, HttpException, HttpStatus, BadRequestException, Query } from '@nestjs/common';
import { TestCatalogService } from './test-catalog.service';
import { CreateTestCatalogDto } from './dto/create-test-catalog.dto';
import { UpdateTestCatalogDto } from './dto/update-test-catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('test-catalog')
@UseGuards(JwtAuthGuard, RoleGuard)
export class TestCatalogController {
    private readonly logger = new Logger(TestCatalogController.name);

    constructor(private readonly testCatalogService: TestCatalogService) { }

    @Post()
    @Roles(UserType.ADMIN)
    async create(@Body() createTestCatalogDto: CreateTestCatalogDto) {
        try {
            return await this.testCatalogService.create(createTestCatalogDto);
        } catch (error) {
            if (error instanceof BadRequestException) {
                // Re-throw known error directly
                throw error;
            }
            this.logger.error(`Error creating test catalog: ${error.message}`);
            throw new HttpException(
                'Failed to create test catalog',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get()
    @Roles(UserType.ADMIN, UserType.MANAGER, UserType.CLIENT, UserType.STAFF)
    async findAll(@Query() paginationDto: PaginationDto) {
        try {
            return await this.testCatalogService.findAll(paginationDto);
        } catch (error) {
            this.logger.error(`Error fetching test catalogs: ${error.message}`);
            throw new HttpException(
                'Failed to fetch test catalogs',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get(':id')
    @Roles(UserType.ADMIN, UserType.MANAGER, UserType.CLIENT, UserType.STAFF)
    async findOne(@Param('id') id: string) {
        try {
            return await this.testCatalogService.findOne(id);
        } catch (error) {
            this.logger.error(`Error fetching test catalog: ${error.message}`);
            throw new HttpException(
                'Failed to fetch test catalog',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Patch(':id')
    @Roles(UserType.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateTestCatalogDto: UpdateTestCatalogDto,
    ) {
        try {
            return await this.testCatalogService.update(id, updateTestCatalogDto);
        } catch (error) {
            this.logger.error(`Error updating test catalog: ${error.message}`);
            throw new HttpException(
                'Failed to update test catalog',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Delete(':id')
    @Roles(UserType.ADMIN)
    async remove(@Param('id') id: string) {
        try {
            return await this.testCatalogService.remove(id);
        } catch (error) {
            this.logger.error(`Error deleting test catalog: ${error.message}`);
            throw new HttpException(
                'Failed to delete test catalog',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
} 