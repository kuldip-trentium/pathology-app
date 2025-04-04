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
    BadRequestException
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

    constructor(private readonly userService: UserService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @Roles(UserType.ADMIN)
    async create(@Body() createUserDto: CreateUserDto, @Request() req) {
        try {
            this.logger.debug(`Creating user with data: ${JSON.stringify(createUserDto)}`);
            return await this.userService.create(createUserDto, req.user);
        } catch (error) {
            this.logger.error(`Error creating user: ${error.message}`, error.stack);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get()
    @Roles(UserType.ADMIN)
    async findAll(@Request() req) {
        try {
            this.logger.debug('Fetching all users');
            return await this.userService.findAll(req.user);
        } catch (error) {
            this.logger.error(`Error fetching users: ${error.message}`, error.stack);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    @Roles(UserType.ADMIN)
    async findOne(@Param('id') id: string, @Request() req) {
        try {
            this.logger.debug(`Fetching user with id: ${id}`);
            const user = await this.userService.findOne(id, req.user);
            if (!user) {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            return user;
        } catch (error) {
            this.logger.error(`Error fetching user: ${error.message}`, error.stack);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @Roles(UserType.ADMIN)
    async update(@Param('id') id: string, @Body() updateData: UpdateUserDto, @Request() req) {
        try {
            this.logger.debug(`Updating user ${id} with data: ${JSON.stringify(updateData)}`);
            const updatedUser = await this.userService.update(id, updateData, req.user);
            if (!updatedUser) {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            return updatedUser;
        } catch (error) {
            this.logger.error(`Error updating user: ${error.message}`, error.stack);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete(':id')
    @Roles(UserType.ADMIN)
    async remove(@Param('id') id: string, @Request() req) {
        try {
            this.logger.debug(`Deleting user with id: ${id}`);
            const result = await this.userService.remove(id, req.user);
            if (!result) {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            return { message: 'User deleted successfully' };
        } catch (error) {
            this.logger.error(`Error deleting user: ${error.message}`, error.stack);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
