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
import { PcsService } from './pcs.service';
import { CreatePcDto } from './dto/create-pc.dto';
import { UpdatePcDto } from './dto/update-pc.dto';
import { RegisterPcDto } from './dto/register-pc.dto';
import { HeartbeatPcDto } from './dto/heartbeat-pc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PCStatus } from '@prisma/client';

@Controller()
export class PcsController {
    constructor(private pcsService: PcsService) { }

    @Get('zones/:zoneId/pcs')
    @UseGuards(JwtAuthGuard)
    findByZone(@Param('zoneId') zoneId: string) {
        return this.pcsService.findByZone(zoneId);
    }

    @Post('zones/:zoneId/pcs')
    @UseGuards(JwtAuthGuard)
    create(
        @Param('zoneId') zoneId: string,
        @Request() req,
        @Body() createPcDto: CreatePcDto,
    ) {
        return this.pcsService.create(zoneId, req.user.id, req.user.role, createPcDto);
    }

    @Get('pcs/:id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.pcsService.findOne(id);
    }

    @Patch('pcs/:id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() updatePcDto: UpdatePcDto,
    ) {
        return this.pcsService.update(id, req.user.id, req.user.role, updatePcDto);
    }

    @Patch('pcs/:id/status')
    @UseGuards(JwtAuthGuard)
    updateStatus(
        @Param('id') id: string,
        @Request() req,
        @Body('status') status: PCStatus,
    ) {
        return this.pcsService.updateStatus(id, status, req.user.id, req.user.role);
    }

    @Get('pcs/:id/current-session')
    @UseGuards(JwtAuthGuard)
    getCurrentSession(@Param('id') id: string) {
        return this.pcsService.getCurrentSession(id);
    }

    @Delete('pcs/:id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @Request() req) {
        return this.pcsService.remove(id, req.user.id, req.user.role);
    }

    // ============================================
    // ENDPOINTS PARA AGENTES (sin JWT, usan API Key)
    // ============================================

    @Post('pcs/register')
    @UseGuards(ApiKeyGuard)
    register(@Body() registerDto: RegisterPcDto) {
        return this.pcsService.register(registerDto);
    }

    @Patch('pcs/:id/heartbeat')
    @UseGuards(ApiKeyGuard)
    heartbeat(
        @Param('id') id: string,
        @Body() heartbeatDto: HeartbeatPcDto,
    ) {
        return this.pcsService.heartbeat(id, heartbeatDto);
    }

    @Get('pcs/:id/config')
    @UseGuards(ApiKeyGuard)
    getAgentConfig(@Param('id') id: string) {
        return this.pcsService.getAgentConfig(id);
    }

    @Patch('pcs/:id/logout')
    @UseGuards(ApiKeyGuard)
    pcLogout(@Param('id') id: string) {
        return this.pcsService.pcLogout(id);
    }
}
