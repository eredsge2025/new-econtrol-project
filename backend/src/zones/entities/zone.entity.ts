export class ZoneEntity {
    id: string;
    name: string;
    description: string | null;
    baseRate: any; // Decimal de Prisma
    lanId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<ZoneEntity>) {
        Object.assign(this, partial);
    }
}
