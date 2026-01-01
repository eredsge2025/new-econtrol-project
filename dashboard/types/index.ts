// Enums
export enum UserRole {
    CLIENT = 'CLIENT',
    STAFF = 'STAFF',
    LAN_ADMIN = 'LAN_ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum ApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum MembershipTier {
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
    PLATINUM = 'PLATINUM',
}

// User
export interface User {
    id: string;
    email: string;
    username: string;
    phone: string;
    balance: string;
    loyaltyPoints: number;
    membershipTier: string;
    role: UserRole;
    approvalStatus?: ApprovalStatus;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    managedLanId?: string;
}

export interface LANCenter {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    country: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Zone {
    id: string;
    lanId: string;
    name: string;
    description?: string;
    baseRate: string;
    position: number;
    createdAt: string;
    updatedAt: string;
}

export interface PC {
    id: string;
    zoneId: string;
    name: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'OFFLINE';
    specs: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    activeUser?: User;
    sessions?: Session[];
}

export interface Session {
    id: string;
    userId: string;
    pcId: string;
    lanId: string;
    startedAt: string;
    endedAt?: string;
    expiresAt?: string;
    durationSeconds: number;
    totalCost: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    paymentMethod?: string;
    user?: Partial<User>;
    pc?: Partial<PC>;
}

export interface RateSchedule {
    id: string;
    zoneId: string;
    minutes: number;
    price: string;
    isActive: boolean;
}

export interface Bundle {
    id: string;
    zoneId: string;
    name: string;
    minutes: number;
    price: string;
    isSaveable: boolean;
    isActive: boolean;
}

export interface AuthResponse {
    user: User;
    access_token: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    username: string;
    password: string;
    phone: string;
}

export interface RegisterLanAdminData {
    email: string;
    username: string;
    password: string;
    phone: string;
    lanName: string;
    lanAddress: string;
    lanCity: string;
    lanCountry: string;
    timezone?: string;
}

export interface PendingApproval {
    id: string;
    email: string;
    username: string;
    phone: string;
    createdAt: string;
    approvalStatus: ApprovalStatus;
}
