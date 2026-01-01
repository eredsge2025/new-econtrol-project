import { IsEmail, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { UserRole, MembershipTier } from '@prisma/client';

export class UpdateUserDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @IsEnum(MembershipTier)
    @IsOptional()
    membershipTier?: MembershipTier;

    @IsNumber()
    @IsOptional()
    loyaltyPoints?: number;
}
