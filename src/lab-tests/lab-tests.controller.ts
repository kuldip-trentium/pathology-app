import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, HttpException, HttpStatus, BadRequestException, Query } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { UpdateLabTestDto } from './dto/update-lab-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('lab-tests')
@UseGuards(JwtAuthGuard, RoleGuard)
export class LabTestsController {
    private readonly logger = new Logger(LabTestsController.name);

    constructor(private readonly labTestsService: LabTestsService) { }

    @Post()
    @Roles(UserType.ADMIN)
    async create(@Body() createLabTestDto: CreateLabTestDto) {
        try {
            return await this.labTestsService.create(createLabTestDto);
        } catch (error) {
            if (error instanceof BadRequestException) {
                // Re-throw known error directly
                throw error;
            }
            this.logger.error(`Error creating lab test: ${error.message}`);
            throw new HttpException(
                'Failed to create lab test',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get()
    async findAll(@Query() paginationDto: PaginationDto) {
        try {
            return await this.labTestsService.findAll(paginationDto);
        } catch (error) {
            this.logger.error(`Error fetching lab tests: ${error.message}`);
            throw new HttpException(
                'Failed to fetch lab tests',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        try {
            return await this.labTestsService.findOne(id);
        } catch (error) {
            this.logger.error(`Error fetching lab test: ${error.message}`);
            throw new HttpException(
                'Failed to fetch lab test',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Patch(':id')
    @Roles(UserType.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateLabTestDto: UpdateLabTestDto,
    ) {
        try {
            return await this.labTestsService.update(id, updateLabTestDto);
        } catch (error) {
            this.logger.error(`Error updating lab test: ${error.message}`);
            throw new HttpException(
                'Failed to update lab test',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Delete(':id')
    @Roles(UserType.ADMIN)
    async remove(@Param('id') id: string) {
        try {
            return await this.labTestsService.remove(id);
        } catch (error) {
            this.logger.error(`Error deleting lab test: ${error.message}`);
            throw new HttpException(
                'Failed to delete lab test',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('by-lab/:labId')
    async findByLabId(@Param('labId') labId: string) {
        try {
            return await this.labTestsService.findByLabId(labId);
        } catch (error) {
            this.logger.error(`Error fetching lab tests by labId: ${error.message}`);
            throw new HttpException(
                'Failed to fetch lab tests by labId',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
} 