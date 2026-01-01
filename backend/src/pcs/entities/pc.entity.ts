import { PCStatus } from '@prisma/client';

export class PcEntity {
    id: string;
    zoneId: string;
    name: string;
    status: PCStatus;
    specs: any;
    positionX: number | null;
    positionY: number | null;
    agentVersion: string | null;
    macAddress: string | null;
    lastHeartbeat: Date | null;
    createdAt: Date;
    updatedAt: Date;
    activeUser?: any; // Añadido para mostrar usuario en dashboard

    constructor(partial: Partial<PcEntity>) {
        Object.assign(this, partial);
    }
}
