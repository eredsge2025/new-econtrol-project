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
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ZonesController {
    constructor(private zonesService: ZonesService) { }

    @Get('lans/:lanId/zones')
    findByLan(@Param('lanId') lanId: string) {
        return this.zonesService.findByLan(lanId);
    }

    @Post('lans/:lanId/zones')
    create(
        @Param('lanId') lanId: string,
        @Request() req,
        @Body() createZoneDto: CreateZoneDto,
    ) {
        return this.zonesService.create(lanId, req.user.id, req.user.role, createZoneDto);
    }

    @Get('zones/:id')
    findOne(@Param('id') id: string) {
        return this.zonesService.findOne(id);
    }

    @Get('zones/:id/stats')
    getStats(@Param('id') id: string) {
        return this.zonesService.getStats(id);
    }

    @Patch('zones/:id')
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() updateZoneDto: UpdateZoneDto,
    ) {
        return this.zonesService.update(id, req.user.id, req.user.role, updateZoneDto);
    }

    @Delete('zones/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Request() req) {
        return this.zonesService.remove(id, req.user.id, req.user.role);
    }
}
