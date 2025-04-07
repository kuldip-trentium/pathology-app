import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Query,
  UnauthorizedException,
  Logger,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './roles.decorator';
import { UserType } from './decorators/roles.decorator';
import { ResendVerificationDto } from './dto/resend-verification-dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto) {
    try {
      if (!loginDto.email || !loginDto.password) {
        throw new BadRequestException('Email and password are required');
      }
      this.logger.debug(`Login attempt for email: ${loginDto.email}`);
      return await this.authService.login(loginDto.email, loginDto.password);
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() registerDto: RegisterDto) {
    try {
      if (!registerDto.email || !registerDto.password || !registerDto.name) {
        throw new BadRequestException('Name, email and password are required');
      }
      this.logger.debug(`Register attempt for email: ${registerDto.email}`);
      return await this.authService.register(registerDto);
    } catch (error) {
      this.logger.error(`Registration error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify-email')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    try {
      if (!verifyEmailDto.token) {
        throw new BadRequestException('Verification token is required');
      }
      return await this.authService.verifyEmail(verifyEmailDto);
    } catch (error) {
      this.logger.error(
        `Email verification error: ${error.message}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Email verification failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resend-verification')
  async resendVerificationEmail(@Body() resendVerificationDto: ResendVerificationDto) {
    try {
      if (!resendVerificationDto.email) {
        throw new BadRequestException('Email is required');
      }
      return await this.authService.resendVerificationEmail(resendVerificationDto.email);
    } catch (error) {
      this.logger.error(
        `Resend verification error: ${error.message}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to resend verification email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      if (!forgotPasswordDto.email) {
        throw new BadRequestException('Email is required');
      }
      return await this.authService.forgotPassword(forgotPasswordDto);
    } catch (error) {
      this.logger.error(`Forgot password error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to process forgot password request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      if (!resetPasswordDto.token || !resetPasswordDto.newPassword) {
        throw new BadRequestException('Token and new password are required');
      }
      return await this.authService.resetPassword(resetPasswordDto);
    } catch (error) {
      this.logger.error(`Reset password error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to reset password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      if (
        !changePasswordDto.currentPassword ||
        !changePasswordDto.newPassword
      ) {
        throw new BadRequestException(
          'Current password and new password are required',
        );
      }
      return await this.authService.changePassword(
        req.user.sub,
        changePasswordDto,
      );
    } catch (error) {
      this.logger.error(`Change password error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to change password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
