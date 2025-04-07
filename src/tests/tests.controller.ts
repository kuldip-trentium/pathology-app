import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestStatusDto } from './dto/update-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserType } from 'src/auth/decorators/roles.decorator';
import { Roles } from 'src/auth/roles.decorator';

@ApiTags('tests')
@Controller('tests')
@UseGuards(JwtAuthGuard)
export class TestsController {
    constructor(private readonly testsService: TestsService) { }
    @Roles(UserType.CLIENT)
    @Post()
    create(@Req() req, @Body() createTestDto: CreateTestDto) {
        const { sub: userId, userType } = req.user;
        if (userType !== UserType.CLIENT) {
            throw new ForbiddenException('Unauthorized access');
        }
        return this.testsService.create(userId, createTestDto);
    }

    @Get()
    findAll(@Req() req) {
        const { sub: userId, userType } = req.user;
        if (userType !== UserType.CLIENT) {
            throw new ForbiddenException('Unauthorized access');
        }
        return this.testsService.findAll(userId);
    }

    @Get(':id')
    findOne(@Req() req, @Param('id') id: string) {
        const { sub: userId, userType } = req.user;
        if (userType !== UserType.CLIENT) {
            throw new ForbiddenException('Unauthorized access');
        }
        return this.testsService.findOne(userId, id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update test status' })
    @ApiResponse({ status: 200, description: 'Test status updated successfully' })
    updateStatus(
        @Req() req,
        @Param('id') id: string,
        @Body() updateTestStatusDto: UpdateTestStatusDto,
    ) {
        const { sub: userId, userType } = req.user;
        if (userType !== UserType.CLIENT) {
            throw new ForbiddenException('Unauthorized access');
        }
        return this.testsService.updateStatus(userId, id, updateTestStatusDto.status);
    }

    @Delete(':id')
    remove(@Req() req, @Param('id') id: string) {
        const { sub: userId, userType } = req.user;
        if (userType !== UserType.CLIENT) {
            throw new ForbiddenException('Unauthorized access');
        }
        return this.testsService.remove(userId, id);
    }
} 