import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Get('summary')
    async getSummary(@Query('lanId') lanId: string) {
        if (!lanId) throw new BadRequestException('lanId is required');
        return this.financeService.getDailySummary(lanId);
    }
}
