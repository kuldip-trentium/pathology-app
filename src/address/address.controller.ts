import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { OpenCageService } from './open-cage.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    [key: string]: any;
  };
}

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
  private readonly logger = new Logger(AddressController.name);

  constructor(
    private readonly addressService: AddressService,
    private readonly openCageService: OpenCageService,
  ) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() createAddressDto: CreateAddressDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user.sub;
      const userType = req.user.userType;

      return await this.addressService.create(createAddressDto, userId, "USER", userType);
    } catch (error) {
      this.logger.error(`Create address error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.addressService.findAll();
    } catch (error) {
      this.logger.error(
        `Find all addresses error: ${error.message}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch addresses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const address = await this.addressService.findOne(id);
      if (!address) {
        throw new NotFoundException(`Address with ID ${id} not found`);
      }
      return address;
    } catch (error) {
      this.logger.error(`Find address error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    try {
      const updatedAddress = await this.addressService.update(
        id,
        updateAddressDto,
      );
      if (!updatedAddress) {
        throw new NotFoundException(`Address with ID ${id} not found`);
      }
      return updatedAddress;
    } catch (error) {
      this.logger.error(`Update address error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.addressService.remove(id);
      if (!result) {
        throw new NotFoundException(`Address with ID ${id} not found`);
      }
      return { message: 'Address deleted successfully' };
    } catch (error) {
      this.logger.error(`Delete address error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('geocode/:address')
  async geocodeAddress(@Param('address') address: string) {
    try {
      if (!address) {
        throw new BadRequestException('Address is required');
      }
      return await this.openCageService.geocodeAddress(address);
    } catch (error) {
      this.logger.error(`Geocode address error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to geocode address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: number, @Query('lng') lng: number) {
    try {
      if (!lat || !lng) {
        throw new BadRequestException('Latitude and longitude are required');
      }
      return await this.openCageService.reverseGeocode(lat, lng);
    } catch (error) {
      this.logger.error(`Reverse geocode error: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to reverse geocode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
