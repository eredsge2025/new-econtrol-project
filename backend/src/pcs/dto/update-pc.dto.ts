import { IsString, IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import { PCStatus } from '@prisma/client';

export class UpdatePcDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsObject()
    @IsOptional()
    specs?: Record<string, any>;

    @IsEnum(PCStatus)
    @IsOptional()
    status?: PCStatus;

    @IsNumber()
    @IsOptional()
    positionX?: number;

    @IsNumber()
    @IsOptional()
    positionY?: number;

    @IsString()
    @IsOptional()
    zoneId?: string;
}

