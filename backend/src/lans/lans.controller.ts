import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { LANsService } from './lans.service';
import { CreateLanDto } from './dto/create-lan.dto';
import { UpdateLanDto } from './dto/update-lan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('lans')
@UseGuards(JwtAuthGuard)
export class LANsController {
    constructor(private lansService: LANsService) { }

    @Get()
    findAll(@Request() req) {
        return this.lansService.findAll(req.user.id, req.user.role);
    }

    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.lansService.findBySlug(slug);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.lansService.findOne(id);
    }

    @Get(':id/stats')
    getStats(@Param('id') id: string) {
        return this.lansService.getStats(id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    create(@Request() req, @Body() createLanDto: CreateLanDto) {
        return this.lansService.create(req.user.id, createLanDto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() updateLanDto: UpdateLanDto,
    ) {
        return this.lansService.update(id, req.user.id, req.user.role, updateLanDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Request() req) {
        return this.lansService.remove(id, req.user.id, req.user.role);
    }
}
