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
    async getTransactions(lanId: string, params: {
        page?: number;
        limit?: number;
        type?: string;
        paymentMethod?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }) {
        const page = params.page ? Number(params.page) : 1;
        const limit = params.limit ? Number(params.limit) : 20;
        const skip = (page - 1) * limit;

        const where: any = {
            lanId,
        };

        if (params.type && params.type !== 'ALL') {
            where.type = params.type;
        }

        if (params.paymentMethod && params.paymentMethod !== 'ALL') {
            where.paymentMethod = params.paymentMethod;
        }

        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) where.createdAt.gte = new Date(params.startDate);
            if (params.endDate) {
                const end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        if (params.search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            { username: { contains: params.search, mode: 'insensitive' } },
                            { email: { contains: params.search, mode: 'insensitive' } }
                        ]
                    }
                },
                {
                    session: {
                        pc: {
                            name: { contains: params.search, mode: 'insensitive' }
                        }
                    }
                }
            ];
        }


        const [data, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    },
                    staff: {
                        select: {
                            username: true,
                            email: true
                        }
                    },
                    session: {
                        select: {
                            id: true,
                            durationSeconds: true,
                            startedAt: true,
                            endedAt: true,
                            pc: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                skip
            }),
            this.prisma.transaction.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };
    }
}
