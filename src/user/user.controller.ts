import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Patch,
  Request,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthRequest, Role } from 'src/types/auth-request';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles, UserType } from 'src/auth/decorators/roles.decorator';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.MANAGER)
  async create(@Req() req, @Body() createUserDto: CreateUserDto) {
    try {
      this.logger.debug(`Creating user with email: ${createUserDto.email}`);
      return await this.userService.create(createUserDto, {
        id: req.user.sub,
        userType: req.user.userType,
      });
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'Failed to create user. Please try again later.',
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.ADMIN, UserType.MANAGER)
  async findAll(@Req() req) {
    try {
      this.logger.debug('Fetching users');

      const { sub: userId, userType } = req.user;

      if (userType === UserType.ADMIN) {
        return await this.userService.getManagersWithStaff();
      } else if (userType === UserType.MANAGER) {
        return await this.userService.getStaffByManager(userId);
      } else {
        throw new ForbiddenException('Unauthorized access');
      }
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'Failed to fetch users. Please try again later.',
      );
    }
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.MANAGER)
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      this.logger.debug(`Fetching user with id: ${id}`);
      const { sub: currentUserId, userType } = req.user;

      const user = await this.userService.findOneByAccessControl(
        id,
        currentUserId,
        userType,
      );

      if (!user) {
        throw new NotFoundException(
          `User with ID ${id} not found or access denied`,
        );
      }

      return user;
    } catch (error) {
      this.logger.error(`Error fetching user: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Roles(UserType.ADMIN, UserType.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @Request() req,
  ) {
    try {
      this.logger.debug(
        `Updating user ${id} with data: ${JSON.stringify(updateData)}`,
      );
      const updatedUser = await this.userService.updateUserByRole(
        id,
        updateData,
        req.user,
      );
      if (!updatedUser) {
        throw new NotFoundException(
          `User with ID ${id} not found or access denied`,
        );
      }
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.MANAGER)
  async remove(@Param('id') id: string, @Request() req) {
    try {
      this.logger.debug(`Deleting user with id: ${id}`);
      const deleted = await this.userService.deleteUserByRole(id, req.user);
      if (!deleted) {
        throw new NotFoundException(
          `User with ID ${id} not found or access denied`,
        );
      }
      return { message: 'User deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
