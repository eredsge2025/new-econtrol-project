import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveUserDto, RejectUserDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get('pending-approvals')
    getPendingApprovals(@Request() req) {
        return this.adminService.getPendingApprovals(req.user.id, req.user.role);
    }

    @Post('approvals/:userId/approve')
    approveUser(
        @Param('userId') userId: string,
        @Request() req,
        @Body() approveDto: ApproveUserDto,
    ) {
        return this.adminService.approveUser(
            req.user.id,
            req.user.role,
            userId,
            approveDto,
        );
    }

    @Post('approvals/:userId/reject')
    rejectUser(
        @Param('userId') userId: string,
        @Request() req,
        @Body() rejectDto: RejectUserDto,
    ) {
        return this.adminService.rejectUser(
            req.user.id,
            req.user.role,
            userId,
            rejectDto,
        );
    }

    @Get('approval-stats')
    getApprovalStats(@Request() req) {
        return this.adminService.getApprovalStats(req.user.role);
    }

    @Get('logs')
    getApprovalLogs(
        @Request() req,
        @Query('action') action?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filters: any = {};

        if (action) {
            filters.action = action;
        }
        if (startDate) {
            filters.startDate = new Date(startDate);
        }
        if (endDate) {
            filters.endDate = new Date(endDate);
        }
        if (limit) {
            filters.limit = parseInt(limit, 10);
        }
        if (offset) {
            filters.offset = parseInt(offset, 10);
        }

        return this.adminService.getApprovalLogs(req.user.role, filters);
    }
}
