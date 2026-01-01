import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { LANStatus } from '@prisma/client';

export class UpdateLanDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsOptional()
    timezone?: string;

    @IsObject()
    @IsOptional()
    settings?: Record<string, any>;

    @IsEnum(LANStatus)
    @IsOptional()
    status?: LANStatus;
}
