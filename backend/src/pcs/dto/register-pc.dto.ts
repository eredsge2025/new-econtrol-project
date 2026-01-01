import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterPcDto {
    @IsString()
    @IsNotEmpty()
    lanId: string;

    @IsString()
    @IsNotEmpty()
    macAddress: string;

    @IsString()
    @IsNotEmpty()
    ipAddress: string;

    @IsString()
    @IsNotEmpty()
    hostname: string;

    @IsString()
    @IsOptional()
    agentVersion?: string;

    @IsString()
    @IsOptional()
    os?: string;
}
