import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { Roles, UserType } from 'src/auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    userType: UserType;
    [key: string]: any;
  };
}

@Controller('labs')
@UseGuards(JwtAuthGuard)
export class LabsController {
  private readonly logger = new Logger(LabsController.name);

  constructor(private readonly labsService: LabsService) { }

  @Post()
  @Roles(UserType.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() createLabDto: CreateLabDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.labsService.create(createLabDto, {
        id: req.user.sub,
        userType: req.user.userType,
      });
    } catch (error) {
      this.logger.error(`Create lab error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create lab',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Req() req: RequestWithUser, @Query() paginationDto: PaginationDto) {
    try {
      return await this.labsService.findAll({
        id: req.user.sub,
        userType: req.user.userType,
      }, paginationDto);
    } catch (error) {
      this.logger.error(`Find all labs error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch labs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      const lab = await this.labsService.findOne(id, {
        id: req.user.sub,
        userType: req.user.userType,
      });
      if (!lab) {
        throw new NotFoundException(`Lab with ID ${id} not found`);
      }
      return lab;
    } catch (error) {
      this.logger.error(`Find lab error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch lab',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id') id: string,
    @Body() updateLabDto: UpdateLabDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const updatedLab = await this.labsService.update(id, updateLabDto, {
        id: req.user.sub,
        userType: req.user.userType,
      });
      if (!updatedLab) {
        throw new NotFoundException(`Lab with ID ${id} not found`);
      }
      return updatedLab;
    } catch (error) {
      this.logger.error(`Update lab error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update lab',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      const result = await this.labsService.remove(id, {
        id: req.user.sub,
        userType: req.user.userType,
      });
      if (!result) {
        throw new NotFoundException(`Lab with ID ${id} not found`);
      }
      return { message: 'Lab deleted successfully' };
    } catch (error) {
      this.logger.error(`Delete lab error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete lab',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
