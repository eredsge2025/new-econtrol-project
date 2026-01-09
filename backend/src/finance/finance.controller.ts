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

    @Get('transactions')
    async getTransactions(
        @Query('lanId') lanId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('type') type?: string,
        @Query('paymentMethod') paymentMethod?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
    ) {
        if (!lanId) throw new BadRequestException('lanId is required');
        return this.financeService.getTransactions(lanId, {
            page,
            limit,
            type,
            paymentMethod,
            startDate,
            endDate,
            search
        });
    }
}
