import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    async getDailySummary(lanId: string) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch all transactions for this LAN today
        const transactions = await this.prisma.transaction.findMany({
            where: {
                lanId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // Initialize Summary
        const summary = {
            totalCash: 0,     // Physical Money in Drawer
            totalDigital: 0,  // Yape, Plin, Transfer (External)
            totalInternal: 0, // Balance Usage (Prepaid)
            breakdown: {} as Record<string, number>
        };

        for (const tx of transactions) {
            const method = tx.paymentMethod || 'CASH';
            const amount = Number(tx.amount);

            if (!summary.breakdown[method]) summary.breakdown[method] = 0;

            if (tx.type === 'REFUND') {
                summary.breakdown[method] -= amount;

                if (method === 'CASH') {
                    summary.totalCash -= amount;
                } else if (method === 'BALANCE') {
                    summary.totalInternal -= amount;
                } else {
                    summary.totalDigital -= amount; // Assume everything else is Digital/External
                }
            } else {
                // RECHARGE, SESSION_PAYMENT, STORE_PURCHASE
                summary.breakdown[method] += amount;

                if (method === 'CASH') {
                    summary.totalCash += amount;
                } else if (method === 'BALANCE') {
                    summary.totalInternal += amount;
                } else {
                    summary.totalDigital += amount;
                }
            }
        }

        // Rounding for clean JSON
        summary.totalCash = Number(summary.totalCash.toFixed(2));
        summary.totalDigital = Number(summary.totalDigital.toFixed(2));
        summary.totalInternal = Number(summary.totalInternal.toFixed(2));
        Object.keys(summary.breakdown).forEach(k => {
            summary.breakdown[k] = Number(summary.breakdown[k].toFixed(2));
        });

        return summary;
    }
}
