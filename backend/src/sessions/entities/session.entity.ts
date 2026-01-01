import { SessionStatus } from '@prisma/client';

export class SessionEntity {
    id: string;
    userId: string;
    pcId: string;
    lanId: string;

    startedAt: Date;
    endedAt: Date | null;
    durationSeconds: number;

    ratePerMinute: any; // Decimal
    totalCost: any; // Decimal

    status: SessionStatus;
    paymentMethod: string | null;

    expiresAt: Date | null;
    isPaid: boolean;
    pricingType: string | null;

    createdAt?: Date;
    updatedAt?: Date;

    constructor(partial: Partial<SessionEntity>) {
        Object.assign(this, partial);
    }
}
