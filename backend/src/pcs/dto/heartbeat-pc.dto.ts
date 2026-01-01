import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PCStatus } from '@prisma/client';

export class HeartbeatPcDto {
    @IsString()
    @IsOptional()
    ipAddress?: string;

    @IsEnum(PCStatus)
    @IsOptional()
    status?: PCStatus;
}
