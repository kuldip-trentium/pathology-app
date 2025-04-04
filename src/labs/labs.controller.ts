import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { UserType } from '../auth/decorators/roles.decorator';

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
    constructor(private readonly labsService: LabsService) { }

    @Post()
    create(@Body() createLabDto: CreateLabDto, @Req() req: RequestWithUser) {
        return this.labsService.create(createLabDto, {
            id: req.user.sub,
            userType: req.user.userType
        });
    }

    @Get()
    findAll(@Req() req: RequestWithUser) {
        return this.labsService.findAll({
            id: req.user.sub,
            userType: req.user.userType
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.labsService.findOne(id, {
            id: req.user.sub,
            userType: req.user.userType
        });
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateLabDto: UpdateLabDto,
        @Req() req: RequestWithUser
    ) {
        return this.labsService.update(id, updateLabDto, {
            id: req.user.sub,
            userType: req.user.userType
        });
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: RequestWithUser) {
        return this.labsService.remove(id, {
            id: req.user.sub,
            userType: req.user.userType
        });
    }
}
