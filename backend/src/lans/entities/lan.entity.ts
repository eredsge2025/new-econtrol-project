import { LANStatus } from '@prisma/client';

export class LanEntity {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    ownerId: string;
    apiKey: string;
    settings: any;
    status: LANStatus;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<LanEntity>) {
        Object.assign(this, partial);
    }
}
