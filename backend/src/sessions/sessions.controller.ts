import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
    constructor(private sessionsService: SessionsService) { }

    @Post('start')
    start(@Request() req, @Body() startDto: StartSessionDto) {
        // Allow Admin/Staff to specify userId.
        // If not specified, default to req.user.id (if typical client flow).
        // If Admin is clicking "Start Session" on Dashboard, they SHOULD pass startDto.userId.
        // If they don't, we might need logic in Service to use PC's activeUser.
        // For security, if startDto.userId is set, checking role is good practice but we'll leave it to Service/Validation.
        return this.sessionsService.start(startDto.userId || req.user.id, startDto);
    }

    @Post(':id/extend')
    async extend(@Param('id') id: string, @Body() data: StartSessionDto) {
        return this.sessionsService.extend(id, data.userId, data);
    }

    @Post(':id/undo')
    async undo(@Param('id') id: string) {
        return this.sessionsService.undoLastAction(id);
    }

    @Post(':id/end')
    end(@Param('id') id: string, @Request() req, @Body() endDto: EndSessionDto) {
        return this.sessionsService.end(id, req.user.id, req.user.role, endDto);
    }

    @Get('active')
    findActive(@Request() req, @Query('lanId') lanId?: string) {
        return this.sessionsService.findActive(req.user.id, req.user.role, lanId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.sessionsService.findOne(id, req.user.id, req.user.role);
    }

    @Get(':id/cost-preview')
    getCostPreview(@Param('id') id: string, @Request() req) {
        return this.sessionsService.getCostPreview(id, req.user.id, req.user.role);
    }
}
