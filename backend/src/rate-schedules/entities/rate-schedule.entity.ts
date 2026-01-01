export class RateScheduleEntity {
    id: string;
    zoneId: string;
    minutes: number;
    price: any; // Decimal de Prisma
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<RateScheduleEntity>) {
        Object.assign(this, partial);
    }
}
