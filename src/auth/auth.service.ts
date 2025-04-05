import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { UserType } from './decorators/roles.decorator';
import { OpenCageService } from '../address/open-cage.service';

interface AddressFields {
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

type RequiredAddressFields = Omit<AddressFields, 'latitude' | 'longitude'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
    private openCageService: OpenCageService,
  ) {}

  private validateAddressFields(address: Partial<AddressFields>) {
    const requiredFields: Record<keyof RequiredAddressFields, string> = {
      addressLine1: 'Address line 1 is required',
      addressLine2: 'Address line 2 is required',
      landmark: 'Landmark is required',
      city: 'City is required',
      state: 'State is required',
      country: 'Country is required',
      postalCode: 'Postal code is required',
    };

    const missingFields: string[] = [];
    for (const [field, message] of Object.entries(requiredFields)) {
      if (!address[field as keyof RequiredAddressFields]) {
        missingFields.push(message);
      }
    }

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Address validation failed',
        errors: missingFields,
      });
    }
  }

  async register(registerDto: RegisterDto) {
    const { address, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Validate address for client users
    if (userData.userType === UserType.CLIENT && !address) {
      throw new BadRequestException('Address is required for client users');
    }

    // Validate all address fields if address is provided
    if (address) {
      this.validateAddressFields(address);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user data with defaults
    const userDataWithDefaults = {
      ...userData,
      password: hashedPassword,
      isEmailVerified: false,
      isDeleted: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    // For non-client users, check if they already have an address
    if (userData.userType !== UserType.CLIENT && address) {
      const existingAddress = await this.prisma.address.findFirst({
        where: {
          entityType: 'USER',
        },
      });

      if (existingAddress) {
        throw new BadRequestException(
          'Non-client users can only have one address',
        );
      }
    }

    // Create user first
    const user = await this.prisma.users.create({
      data: userDataWithDefaults,
    });

    if (!user) {
      throw new BadRequestException('Failed to create user');
    } else {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Verify Your Email',
        template: 'verification-email',
        context: {
          name: user.name,
          verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`,
        },
      });
    }

    // Create address if provided
    if (address) {
      // If coordinates are not provided, geocode the address
      if (!address.latitude || !address.longitude) {
        const geocoded = await this.openCageService.geocodeAddress(
          `${address.addressLine1}, ${address.city}, ${address.state}, ${address.country}`,
        );
        address.latitude = geocoded.location.lat;
        address.longitude = geocoded.location.lng;
      }

      await this.prisma.address.create({
        data: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          landmark: address.landmark,
          city: address.city,
          state: address.state || '',
          country: address.country || '',
          postalCode: address.postalCode || '',
          latitude: address.latitude || 0,
          longitude: address.longitude || 0,
          entityType: 'USER',
          entityId: user.id,
        },
      });
    }

    // Fetch user with address
    const userWithAddress = await this.prisma.users.findUnique({
      where: { id: user.id },
      include: { addresses: true },
    });

    if (!userWithAddress) {
      // Cleanup: Delete the user if we can't fetch it with address
      await this.prisma.users.delete({ where: { id: user.id } });
      throw new BadRequestException('Failed to create user with address');
    }

    return {
      id: userWithAddress.id,
      name: userWithAddress.name,
      email: userWithAddress.email,
      userType: userWithAddress.userType,
      address: userWithAddress.addresses[0],
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        userType: true,
        isEmailVerified: true,
        isDeleted: true,
      },
    });

    if (!user) {
      this.logger.warn(
        `Login attempt failed: User not found for email ${email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isDeleted) {
      this.logger.warn(`Login attempt failed: User ${user.id} is deleted`);
      throw new UnauthorizedException('Account has been deleted');
    }

    if (!user.isEmailVerified) {
      this.logger.warn(
        `Login attempt failed: User ${user.id} email not verified`,
      );
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(
        `Login attempt failed: Invalid password for user ${user.id}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  async createUser(createUserDto: RegisterDto, creatorId?: string) {
    if (!Object.values(UserType).includes(createUserDto.userType)) {
      throw new BadRequestException('Invalid user type');
    }

    if (creatorId) {
      const creator = await this.prisma.users.findUnique({
        where: { id: creatorId, isDeleted: false },
      });

      if (!creator) {
        throw new NotFoundException('Creator not found');
      }

      if (creator.userType === UserType.MANAGER) {
        if (
          createUserDto.userType !== UserType.STAFF &&
          createUserDto.userType !== UserType.CLIENT
        ) {
          throw new UnauthorizedException(
            'Manager can only create STAFF or CLIENT users',
          );
        }
      }

      if (creator.userType === UserType.ADMIN) {
        if (
          createUserDto.userType !== UserType.MANAGER &&
          createUserDto.userType !== UserType.STAFF &&
          createUserDto.userType !== UserType.CLIENT
        ) {
          throw new UnauthorizedException(
            'Admin can only create MANAGER, STAFF, or CLIENT users',
          );
        }
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        userType: createUserDto.userType,
        createdBy: creatorId || null,
        managedBy: creatorId
          ? (await this.prisma.users.findUnique({ where: { id: creatorId } }))
              ?.userType === UserType.MANAGER
            ? creatorId
            : null
          : null,
      },
    });

    return {
      message: 'User created successfully',
      userId: user.id,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.prisma.users.findFirst({
      where: {
        emailVerificationToken: verifyEmailDto.token,
        emailVerificationTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new UnauthorizedException('Email already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 3600000); // 24 hours

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: verificationTokenExpiry,
      },
    });

    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Email Verification',
      template: 'verify-email',
      context: {
        name: user.name,
        verificationUrl,
      },
    });

    return { message: 'Verification email sent' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: forgotPasswordDto.email, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset password email
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        name: user.name,
        resetUrl,
      },
    });

    return { message: 'Password reset email sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.users.findFirst({
      where: {
        resetToken: resetPasswordDto.token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password changed successfully' };
  }
}
