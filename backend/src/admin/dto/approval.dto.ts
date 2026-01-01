import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApproveUserDto {
    @IsBoolean()
    @IsOptional()
    createLan?: boolean; // Si true, crea el LAN automáticamente
}

export class RejectUserDto {
    @IsString()
    @IsOptional()
    reason?: string;
}
