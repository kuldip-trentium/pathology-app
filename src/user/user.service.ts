import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserType } from '../auth/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';

interface CurrentUser {
    id: string;
    userType: UserType;
}

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto, currentUser: CurrentUser) {
        this.logger.debug(`Creating user with email: ${createUserDto.email}`);

        const { password, ...userData } = createUserDto;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Validate role-based permissions
        this.validateUserCreation(currentUser, userData.userType);

        // Create user
        const user = await this.prisma.users.create({
            data: {
                ...userData,
                password: hashedPassword,
                createdBy: currentUser.id,
                managedBy: userData.userType === UserType.STAFF ? currentUser.id : null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true
            },
        });

        return user;
    }

    async findAll(currentUser: CurrentUser) {
        this.logger.debug('Fetching all users');
        if (currentUser.userType === UserType.ADMIN) {
            return this.prisma.users.findMany({
                where: { isDeleted: false },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true
                },
            });
        }

        if (currentUser.userType === UserType.MANAGER) {
            return this.prisma.users.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { createdBy: currentUser.id },
                        { userType: UserType.CLIENT }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true
                },
            });
        }

        throw new ForbiddenException('You do not have permission to view users');
    }

    async findOne(id: string, currentUser: CurrentUser) {
        this.logger.debug(`Fetching user with id: ${id}`);
        const user = await this.prisma.users.findUnique({
            where: { id, isDeleted: false },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true
            },
        });

        if (!user) {
            this.logger.error(`User not found with id: ${id}`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (currentUser.userType === UserType.ADMIN) {
            return user;
        }

        if (currentUser.userType === UserType.MANAGER) {
            if (user.createdBy === currentUser.id || user.userType === UserType.CLIENT) {
                return user;
            }
        }

        throw new ForbiddenException('You do not have permission to view this user');
    }

    async update(id: string, updateUserDto: UpdateUserDto, currentUser: CurrentUser) {
        this.logger.debug(`Updating user with id: ${id}`);

        const user = await this.prisma.users.findUnique({
            where: { id, isDeleted: false },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true
            },
        });

        if (!user) {
            this.logger.error(`User not found with id: ${id}`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        this.validateUserUpdate(currentUser, user);

        const { password, ...updateUserData } = updateUserDto;
        const data: any = { ...updateUserData };

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await this.prisma.users.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true
            },
        });

        return updatedUser;
    }

    async remove(id: string, currentUser: CurrentUser) {
        this.logger.debug(`Deleting user with id: ${id}`);

        const user = await this.prisma.users.findUnique({
            where: { id, isDeleted: false },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                createdAt: true,
                updatedAt: true,
                createdBy: true
            },
        });

        if (!user) {
            this.logger.error(`User not found with id: ${id}`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        this.validateUserDeletion(currentUser, user);

        await this.prisma.users.update({
            where: { id },
            data: { isDeleted: true },
        });

        return { message: `User with ID ${id} has been deleted` };
    }

    private validateUserCreation(currentUser: CurrentUser, targetUserType: UserType): void {
        if (currentUser.userType === UserType.ADMIN) {
            return;
        }

        if (currentUser.userType === UserType.MANAGER) {
            if (targetUserType === UserType.STAFF || targetUserType === UserType.CLIENT) {
                return;
            }
        }

        throw new ForbiddenException('You do not have permission to create this type of user');
    }

    private validateUserUpdate(currentUser: CurrentUser, targetUser: any): void {
        if (currentUser.userType === UserType.ADMIN) {
            return;
        }

        if (currentUser.userType === UserType.MANAGER) {
            if (targetUser.createdBy === currentUser.id || targetUser.userType === UserType.CLIENT) {
                return;
            }
        }

        throw new ForbiddenException('You do not have permission to update this user');
    }

    private validateUserDeletion(currentUser: CurrentUser, targetUser: any): void {
        if (currentUser.userType === UserType.ADMIN) {
            return;
        }

        if (currentUser.userType === UserType.MANAGER) {
            if (targetUser.createdBy === currentUser.id || targetUser.userType === UserType.CLIENT) {
                return;
            }
        }

        throw new ForbiddenException('You do not have permission to delete this user');
    }
}
