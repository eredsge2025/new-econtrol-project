export class BundleEntity {
    id: string;
    zoneId: string;
    name: string;
    minutes: number;
    price: any; // Decimal de Prisma
    isSaveable: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<BundleEntity>) {
        Object.assign(this, partial);
    }
}
