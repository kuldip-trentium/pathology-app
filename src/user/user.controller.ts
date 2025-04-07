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
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles, UserType } from 'src/auth/decorators/roles.decorator';
import { RoleGuard } from 'src/auth/guards/role.guard';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) { }

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
  async findAll(@Req() req, @Query() paginationDto: PaginationDto) {
    try {
      this.logger.debug('Fetching users');

      const { sub: userId, userType } = req.user;

      if (userType === UserType.ADMIN) {
        return await this.userService.getManagersWithStaff(paginationDto);
      } else if (userType === UserType.MANAGER) {
        return await this.userService.getStaffByManager(userId, paginationDto);
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

      const currentUser = req.user;
      const existingUser = await this.userService.findById(id);

      if (!existingUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Role-based access check
      if (currentUser.userType === UserType.ADMIN) {
        if (existingUser.userType !== UserType.MANAGER) {
          throw new ForbiddenException('Admin can only update MANAGER users');
        }
      }

      if (currentUser.userType === UserType.MANAGER) {
        if (existingUser.userType !== UserType.STAFF) {
          throw new ForbiddenException('Manager can only update STAFF users');
        }

        if (existingUser.managedBy !== currentUser.id) {
          throw new ForbiddenException(
            'You are not authorized to update this staff member',
          );
        }
      }

      const updatedUser = await this.userService.updateUserByRole(
        id,
        updateData,
        currentUser,
      );

      if (!updatedUser) {
        throw new NotFoundException(
          `User with ID ${id} not found or access denied`,
        );
      }

      const emailChanged =
        updateData.email && updateData.email !== existingUser.email;
      const passwordChanged =
        updateData.password && updateData.password !== existingUser.password;

      if (emailChanged || passwordChanged) {
        const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;

        await this.mailerService.sendMail({
          to: updatedUser.email,
          subject: 'Your Account Credentials',
          template: 'password-email',
          context: {
            name: updatedUser.name,
            email: updatedUser.email,
            password: updateData.password,
            loginUrl,
          },
        });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        await this.userService.saveVerificationToken(
          updatedUser.id,
          verificationToken,
        );

        await this.mailerService.sendMail({
          to: updatedUser.email,
          subject: 'Verify Your Email',
          template: 'verification-email',
          context: {
            name: updatedUser.name,
            verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`,
          },
        });
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

      const currentUser = req.user;
      const targetUser = await this.userService.findById(id);

      if (!targetUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Role-based access control
      if (currentUser.userType === UserType.ADMIN) {
        if (targetUser.userType !== UserType.MANAGER) {
          throw new ForbiddenException('Admin can only delete MANAGER users');
        }
      }

      if (currentUser.userType === UserType.MANAGER) {
        if (targetUser.userType !== UserType.STAFF) {
          throw new ForbiddenException('Manager can only delete STAFF users');
        }

        if (targetUser.managedBy !== currentUser.id) {
          throw new ForbiddenException(
            'You are not authorized to delete this staff member',
          );
        }
      }

      const deleted = await this.userService.deleteUserByRole(id, currentUser);
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
