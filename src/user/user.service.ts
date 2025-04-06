import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserType } from '../auth/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

interface CurrentUser {
  id: string;
  userType: UserType;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser: CurrentUser) {
    try {
      this.logger.debug(`Creating user with email: ${createUserDto.email}`);

      const { password, labId, address, ...userData } = createUserDto;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Validate role-based permissions
      this.validateUserCreation(currentUser, userData.userType);

      // Check if user with same email exists
      const existingUser = await this.prisma.users.findFirst({
        where: { email: userData.email, isDeleted: false },
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email already exists. Please use a different email address.',
        );
      }

      // Check if lab exists if labId is provided
      if (labId) {
        const lab = await this.prisma.labs.findUnique({
          where: { id: labId },
        });

        if (!lab) {
          throw new NotFoundException(
            `The lab with ID ${labId} does not exist. Please provide a valid lab ID.`,
          );
        }

        // Only managers can be assigned to labs
        if (userData.userType !== UserType.MANAGER) {
          throw new BadRequestException(
            'Only users with manager role can be assigned to labs.',
          );
        }
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user with transaction to handle both user and address creation
      const user = await this.prisma.$transaction(async (prisma) => {
        // Create user with createdBy set to current user's ID
        const newUser = await prisma.users.create({
          data: {
            ...userData,
            password: hashedPassword,
            createdBy: currentUser.id, // Set createdBy to current user's ID
            managedBy:
              userData.userType === UserType.STAFF ? currentUser.id : null,
            emailVerificationToken: verificationToken,
            emailVerificationTokenExpiry: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ),
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            managedBy: true,
          },
        });

        // If labId is provided, create lab manager relationship
        if (labId) {
          await prisma.labManagers.create({
            data: {
              labId: labId,
              userId: newUser.id,
            },
          });
        }

        // If address is provided, create address
        if (address) {
          await prisma.address.create({
            data: {
              ...address,
              entityId: newUser.id,
              entityType: 'USER',
              state: address.state || '',
              country: address.country || '',
              postalCode: address.postalCode || '',
            },
          });
        }

        return newUser;
      });

      // Send password email
      this.mailerService.sendMail({
        to: user.email,
        subject: 'Your Account Credentials',
        template: 'password-email',
        context: {
          name: user.name,
          email: user.email,
          password: password,
          loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
        },
      });

      // Send verification email
      this.mailerService.sendMail({
        to: user.email,
        subject: 'Verify Your Email',
        template: 'verification-email',
        context: {
          name: user.name,
          verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`,
        },
      });

      return user;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'An unexpected error occurred while creating the user. Please try again later.',
      );
    }
  }

  private validateUserCreation(
    currentUser: CurrentUser,
    newUserType: UserType,
  ) {
    // Admin can create any type of user
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    // Manager can only create staff
    if (
      currentUser.userType === UserType.MANAGER &&
      newUserType !== UserType.STAFF
    ) {
      throw new ForbiddenException(
        'Managers can only create staff users. Please contact an administrator to create other types of users.',
      );
    }

    // Staff cannot create any users
    if (currentUser.userType === UserType.STAFF) {
      throw new ForbiddenException(
        'Staff members do not have permission to create users. Please contact your manager or administrator.',
      );
    }
  }

  async findAll(currentUser: CurrentUser) {
    try {
      this.logger.debug(
        `Fetching users for user type: ${currentUser.userType}`,
      );

      // Admin can see all users
      if (currentUser.userType === UserType.ADMIN) {
        const users = await this.prisma.users.findMany({
          where: {
            isDeleted: false,
            userType: {
              in: [UserType.MANAGER, UserType.STAFF],
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            managedBy: true,
          },
        });

        // Get lab information for managers
        const managersWithLabs = await Promise.all(
          users.map(async (user) => {
            if (user.userType === UserType.MANAGER) {
              const labManager = await this.prisma.labManagers.findFirst({
                where: { userId: user.id },
                select: {
                  lab: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });
              return {
                ...user,
                lab: labManager?.lab || null,
              };
            }
            return user;
          }),
        );

        return managersWithLabs;
      }

      // Manager can only see staff they manage or created
      if (currentUser.userType === UserType.MANAGER) {
        const users = await this.prisma.users.findMany({
          where: {
            isDeleted: false,
            userType: UserType.STAFF,
            OR: [{ managedBy: currentUser.id }, { createdBy: currentUser.id }],
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            managedBy: true,
          },
        });

        return users;
      }

      // Staff cannot see any users
      throw new ForbiddenException('You do not have permission to view users');
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch users. Please try again later.',
      );
    }
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
        createdBy: true,
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
      if (
        user.createdBy === currentUser.id ||
        user.userType === UserType.CLIENT
      ) {
        return user;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to view this user',
    );
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUser,
  ) {
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
        createdBy: true,
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
        createdBy: true,
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
        createdBy: true,
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

  private validateUserUpdate(currentUser: CurrentUser, targetUser: any): void {
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    if (currentUser.userType === UserType.MANAGER) {
      if (
        targetUser.createdBy === currentUser.id ||
        targetUser.userType === UserType.CLIENT
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to update this user',
    );
  }

  private validateUserDeletion(
    currentUser: CurrentUser,
    targetUser: any,
  ): void {
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    if (currentUser.userType === UserType.MANAGER) {
      if (
        targetUser.createdBy === currentUser.id ||
        targetUser.userType === UserType.CLIENT
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to delete this user',
    );
  }
  async getManagersWithStaff() {
    return this.prisma.users.findMany({
      where: {
        userType: UserType.MANAGER,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        addresses: {
          select: {
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
            latitude: true,
            longitude: true,
          },
        },
        managedUsers: {
          where: {
            userType: UserType.STAFF,
            isDeleted: false,
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
            createdAt: true,
            addresses: {
              select: {
                addressLine1: true,
                addressLine2: true,
                landmark: true,
                city: true,
                state: true,
                country: true,
                postalCode: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });
  }

  async getStaffByManager(managerId: string) {
    return this.prisma.users.findMany({
      where: {
        managedBy: managerId,
        userType: UserType.STAFF,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        createdAt: true,
        addresses: {
          select: {
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
  }

  async findOneByAccessControl(
    userId: string,
    currentUserId: string,
    userType: number,
  ) {
    // Admin can access anyone
    if (userType === UserType.ADMIN) {
      return this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          createdAt: true,
          managedBy: true,
        },
      });
    }

    // Manager can access their own staff only
    if (userType === UserType.MANAGER) {
      return this.prisma.users.findFirst({
        where: {
          id: userId,
          managedBy: currentUserId,
          userType: UserType.STAFF,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          createdAt: true,
          managedBy: true,
        },
      });
    }

    // Others not allowed
    return null;
  }
  // Admin can update managers, Manager can update staff they manage
  async updateUserByRole(userId: string, updateData: any, currentUser: any) {
    const { sub: currentUserId, userType } = currentUser;

    const userToUpdate = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!userToUpdate) return null;

    if (
      (userType === UserType.ADMIN &&
        userToUpdate.userType !== UserType.MANAGER) ||
      (userType === UserType.MANAGER &&
        userToUpdate.userType !== UserType.STAFF &&
        userToUpdate.managedBy !== currentUserId)
    ) {
      return null; // Not allowed
    }

    return await this.prisma.users.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
    });
  }

  async deleteUserByRole(userId: string, currentUser: any) {
    const { sub: currentUserId, userType } = currentUser;

    const userToDelete = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!userToDelete) return null;

    if (
      (userType === UserType.ADMIN &&
        userToDelete.userType !== UserType.MANAGER) ||
      (userType === UserType.MANAGER &&
        (userToDelete.userType !== UserType.STAFF ||
          userToDelete.managedBy !== currentUserId))
    ) {
      return null; // Not allowed
    }

    // Soft delete
    return await this.prisma.users.update({
      where: { id: userId },
      data: { isDeleted: true, updatedAt: new Date() },
    });
  }
  async findById(id: string) {
    return this.prisma.users.findUnique({ where: { id } });
  }
  async saveVerificationToken(userId: string, token: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: new Date(
          Date.now() + 1000 * 60 * 60 * 24,
        ), // optional: expire in 24 hours
      },
    });
  }
}
