import { UserRole, MembershipTier } from '@prisma/client';

export class UserEntity {
    id: string;
    email: string;
    username: string;
    phone: string | null;
    balance: any; // Decimal de Prisma
    loyaltyPoints: number;
    membershipTier: MembershipTier;
    role: UserRole;
    activePcId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastVisit: Date | null;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }
}
