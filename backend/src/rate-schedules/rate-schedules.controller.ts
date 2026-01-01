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
import { RateSchedulesService } from './rate-schedules.service';
import { CreateRateScheduleDto } from './dto/create-rate-schedule.dto';
import { UpdateRateScheduleDto } from './dto/update-rate-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class RateSchedulesController {
    constructor(private rateSchedulesService: RateSchedulesService) { }

    @Get('zones/:zoneId/rate-schedules')
    findByZone(@Param('zoneId') zoneId: string) {
        return this.rateSchedulesService.findByZone(zoneId);
    }

    @Post('zones/:zoneId/rate-schedules')
    create(
        @Param('zoneId') zoneId: string,
        @Request() req,
        @Body() createDto: CreateRateScheduleDto,
    ) {
        return this.rateSchedulesService.create(zoneId, req.user.id, req.user.role, createDto);
    }

    @Post('zones/:zoneId/rate-schedules/generate')
    generateFromBaseRate(@Param('zoneId') zoneId: string, @Request() req) {
        return this.rateSchedulesService.generateFromBaseRate(zoneId, req.user.id, req.user.role);
    }

    @Patch('rate-schedules/:id')
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() updateDto: UpdateRateScheduleDto,
    ) {
        return this.rateSchedulesService.update(id, req.user.id, req.user.role, updateDto);
    }

    @Delete('rate-schedules/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Request() req) {
        return this.rateSchedulesService.remove(id, req.user.id, req.user.role);
    }
}
