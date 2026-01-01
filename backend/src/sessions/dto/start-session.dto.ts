import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export enum PricingType {
    OPEN = 'OPEN',
    BUNDLE = 'BUNDLE',
    FIXED = 'FIXED',
}

export class StartSessionDto {
    @IsUUID()
    @IsNotEmpty()
    pcId: string;

    @IsEnum(PricingType)
    @IsNotEmpty()
    pricingType: PricingType;

    @IsUUID()
    @IsOptional()
    bundleId?: string;

    @IsUUID()
    @IsOptional()
    userId?: string;

    @IsOptional()
    minutes?: number;
}
